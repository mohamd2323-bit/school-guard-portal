import { Router } from "express";
import { db, appDataTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const router = Router();

const APP_COLLECTIONS = [
  "guards",
  "schools",
  "needs",
  "tickets",
  "operations",
  "violations",
] as const;

const ALL_KEYS = [...APP_COLLECTIONS, "employees", "backups"] as const;

type CollectionKey = (typeof ALL_KEYS)[number];

type EmployeeRecord = {
  id: string;
  username: string;
  password: string;
  status: string;
  [key: string]: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Neon serverless PostgreSQL may suspend after inactivity.
 * Retry temporary wake-up and connection errors before returning a failure.
 */
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

function isNeonWakeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);

  return (
    message.includes("endpoint has been disabled") ||
    message.includes("The endpoint has been disabled") ||
    message.includes("endpoint is in state") ||
    message.includes("Control plane request failed") ||
    message.includes("ECONNRESET") ||
    message.includes("connection terminated unexpectedly")
  );
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isNeonWakeError(err)) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * 2 ** attempt;

        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Database operation failed after retries");
}

async function getCollection(key: CollectionKey): Promise<unknown[]> {
  return withRetry(async () => {
    const rows = await db
      .select()
      .from(appDataTable)
      .where(eq(appDataTable.key, key));

    const value = rows[0]?.value;

    return Array.isArray(value) ? value : [];
  });
}

async function setCollection(
  key: CollectionKey,
  value: unknown[],
): Promise<void> {
  await withRetry(async () => {
    await db
      .insert(appDataTable)
      .values({
        key,
        value,
      })
      .onConflictDoUpdate({
        target: appDataTable.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  });
}

// ─── App data ─────────────────────────────────────────────────────────────────

/** GET /api/appdata — return all application collections */
router.get("/appdata", async (req, res) => {
  try {
    const rows = await withRetry(async () => {
      return db
        .select()
        .from(appDataTable)
        .where(inArray(appDataTable.key, [...APP_COLLECTIONS]));
    });

    const result: Record<string, unknown[]> = {};

    for (const collection of APP_COLLECTIONS) {
      result[collection] = [];
    }

    for (const row of rows) {
      const key = row.key as string;

      if (
        APP_COLLECTIONS.includes(
          key as (typeof APP_COLLECTIONS)[number],
        )
      ) {
        result[key] = Array.isArray(row.value) ? row.value : [];
      }
    }

    res.set("Cache-Control", "no-store");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /appdata failed");
    res.status(500).json({
      error: "خطأ في تحميل البيانات",
    });
  }
});

/** PUT /api/appdata — save all application collections */
router.put("/appdata", async (req, res) => {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

    await Promise.all(
      APP_COLLECTIONS.map((collection) => {
        const value = body[collection];

        return setCollection(
          collection,
          Array.isArray(value) ? value : [],
        );
      }),
    );

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "PUT /appdata failed");
    res.status(500).json({
      error: "خطأ في حفظ البيانات",
    });
  }
});

// ─── Employees ────────────────────────────────────────────────────────────────

/** GET /api/employees — return employees array */
router.get("/employees", async (req, res) => {
  try {
    const employees = await getCollection("employees");

    res.set("Cache-Control", "no-store");
    res.json(employees);
  } catch (err) {
    req.log.error({ err }, "GET /employees failed");
    res.status(500).json({
      error: "خطأ في تحميل الموظفين",
    });
  }
});

/**
 * PUT /api/employees
 * Replace the employees array and hash any plain-text passwords.
 */
router.put("/employees", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: "البيانات غير صالحة",
      });
      return;
    }

    const employees = req.body as Array<Record<string, unknown>>;

    const hashedEmployees = await Promise.all(
      employees.map(async (employee) => {
        const password = employee.password;

        if (
          typeof password === "string" &&
          password.length > 0 &&
          !password.startsWith("$2")
        ) {
          return {
            ...employee,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS),
          };
        }

        return employee;
      }),
    );

    await setCollection("employees", hashedEmployees);

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "PUT /employees failed");
    res.status(500).json({
      error: "خطأ في حفظ الموظفين",
    });
  }
});

// ─── Authentication ───────────────────────────────────────────────────────────

/** POST /api/auth/login — validate credentials */
router.post("/auth/login", async (req, res) => {
  const body =
    req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>)
      : {};

  const username =
    typeof body.username === "string" ? body.username.trim() : "";

  const password =
    typeof body.password === "string" ? body.password : "";

  try {
    if (!username || !password) {
      req.log.warn(
        { username },
        "login: missing username or password",
      );

      res.status(400).json({
        error: "يرجى إدخال اسم المستخدم وكلمة المرور",
      });
      return;
    }

    const employees =
      (await getCollection("employees")) as EmployeeRecord[];

    req.log.info(
      { employeeCount: employees.length },
      "login: employees loaded from DB",
    );

    const employee = employees.find(
      (item) => item.username === username,
    );

    if (!employee) {
      req.log.warn(
        { username },
        "login: rejected — username not found",
      );

      res.status(401).json({
        error:
          "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط",
      });
      return;
    }

    if (employee.status !== "نشط") {
      req.log.warn(
        {
          username,
          status: employee.status,
        },
        "login: rejected — account not active",
      );

      res.status(401).json({
        error:
          "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط",
      });
      return;
    }

    if (
      typeof employee.password !== "string" ||
      employee.password.length === 0
    ) {
      req.log.error(
        { username },
        "login: employee password is missing or invalid",
      );

      res.status(401).json({
        error:
          "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      employee.password,
    );

    if (!passwordMatches) {
      req.log.warn(
        { username },
        "login: rejected — wrong password",
      );

      res.status(401).json({
        error:
          "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط",
      });
      return;
    }

    req.log.info({ username }, "login: success");

    const { password: _password, ...safeUser } = employee;

    res.json(safeUser);
  } catch (err) {
    req.log.error(
      {
        err,
        username,
      },
      "login: database error",
    );

    res.status(500).json({
      error: "خطأ في تسجيل الدخول",
    });
  }
});

/**
 * POST /api/auth/verify
 * Confirm the user's password before destructive actions.
 */
router.post("/auth/verify", async (req, res) => {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      res.status(400).json({ ok: false });
      return;
    }

    const employees =
      (await getCollection("employees")) as EmployeeRecord[];

    const employee = employees.find(
      (item) =>
        item.username === username &&
        item.status === "نشط",
    );

    if (
      !employee ||
      typeof employee.password !== "string" ||
      employee.password.length === 0
    ) {
      res.json({ ok: false });
      return;
    }

    const matches = await bcrypt.compare(
      password,
      employee.password,
    );

    res.json({ ok: matches });
  } catch (err) {
    req.log.error({ err }, "POST /auth/verify failed");
    res.status(500).json({ ok: false });
  }
});

// ─── Backups ──────────────────────────────────────────────────────────────────

/** GET /api/backups — return all backup snapshots */
router.get("/backups", async (req, res) => {
  try {
    const snapshots = await getCollection("backups");

    res.set("Cache-Control", "no-store");
    res.json(snapshots);
  } catch (err) {
    req.log.error({ err }, "GET /backups failed");
    res.status(500).json({
      error: "خطأ في تحميل النسخ الاحتياطية",
    });
  }
});

/** PUT /api/backups — replace all backup snapshots */
router.put("/backups", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: "البيانات غير صالحة",
      });
      return;
    }

    const snapshots = req.body as unknown[];

    await setCollection("backups", snapshots);

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "PUT /backups failed");
    res.status(500).json({
      error: "خطأ في حفظ النسخ الاحتياطية",
    });
  }
});

export default router;

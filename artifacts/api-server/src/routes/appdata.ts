import { Router } from "express";
import { db, appDataTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

const APP_COLLECTIONS = ["guards", "schools", "needs", "tickets", "operations", "violations"] as const;
const ALL_KEYS = [...APP_COLLECTIONS, "employees", "backups"] as const;

type CollectionKey = (typeof ALL_KEYS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCollection(key: CollectionKey): Promise<unknown[]> {
  const rows = await db
    .select()
    .from(appDataTable)
    .where(eq(appDataTable.key, key));
  return (rows[0]?.value as unknown[]) ?? [];
}

async function setCollection(key: CollectionKey, value: unknown[]): Promise<void> {
  await db
    .insert(appDataTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appDataTable.key,
      set: { value, updatedAt: new Date() },
    });
}

// ─── App data (guards, schools, needs, tickets, operations, violations) ───────

/** GET /api/appdata — return all collections in one request */
router.get("/appdata", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(appDataTable)
      .where(inArray(appDataTable.key, [...APP_COLLECTIONS]));

    const result: Record<string, unknown[]> = {};
    for (const col of APP_COLLECTIONS) result[col] = [];
    for (const row of rows) {
      if (APP_COLLECTIONS.includes(row.key as (typeof APP_COLLECTIONS)[number])) {
        result[row.key] = (row.value as unknown[]) ?? [];
      }
    }
    res.json(result);
  } catch (err) {
    req.log.error(err, "GET /appdata failed");
    res.status(500).json({ error: "خطأ في تحميل البيانات" });
  }
});

/** PUT /api/appdata — save all collections atomically */
router.put("/appdata", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown[]>;
    await Promise.all(
      APP_COLLECTIONS.map((col) => setCollection(col, body[col] ?? []))
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "PUT /appdata failed");
    res.status(500).json({ error: "خطأ في حفظ البيانات" });
  }
});

// ─── Employees ────────────────────────────────────────────────────────────────

/** GET /api/employees — return employees array */
router.get("/employees", async (req, res) => {
  try {
    const employees = await getCollection("employees");
    res.json(employees);
  } catch (err) {
    req.log.error(err, "GET /employees failed");
    res.status(500).json({ error: "خطأ في تحميل الموظفين" });
  }
});

/** PUT /api/employees — replace entire employees array */
router.put("/employees", async (req, res) => {
  try {
    const employees = req.body as unknown[];
    if (!Array.isArray(employees)) {
      res.status(400).json({ error: "البيانات غير صالحة" });
      return;
    }
    await setCollection("employees", employees);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "PUT /employees failed");
    res.status(500).json({ error: "خطأ في حفظ الموظفين" });
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/auth/login — validate credentials, return employee or 401 */
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
      return;
    }

    const employees = await getCollection("employees") as Array<{
      id: string;
      username: string;
      password: string;
      status: string;
    }>;

    const user = employees.find(
      (e) =>
        e.username === username.trim() &&
        e.password === password &&
        e.status === "نشط"
    );

    if (!user) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error(err, "POST /auth/login failed");
    res.status(500).json({ error: "خطأ في تسجيل الدخول" });
  }
});

// ─── Backups ──────────────────────────────────────────────────────────────────

/** GET /api/backups — return all backup snapshots */
router.get("/backups", async (req, res) => {
  try {
    const snapshots = await getCollection("backups");
    res.json(snapshots);
  } catch (err) {
    req.log.error(err, "GET /backups failed");
    res.status(500).json({ error: "خطأ في تحميل النسخ الاحتياطية" });
  }
});

/** PUT /api/backups — replace all backup snapshots */
router.put("/backups", async (req, res) => {
  try {
    const snapshots = req.body as unknown[];
    if (!Array.isArray(snapshots)) {
      res.status(400).json({ error: "البيانات غير صالحة" });
      return;
    }
    await setCollection("backups", snapshots);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "PUT /backups failed");
    res.status(500).json({ error: "خطأ في حفظ النسخ الاحتياطية" });
  }
});

export default router;

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

const COLLECTIONS = [
  "guards",
  "schools",
  "needs",
  "tickets",
  "operations",
  "violations",
] as const;

type CollectionKey = (typeof COLLECTIONS)[number];
type AppData = Record<CollectionKey, unknown[]>;

const LOCAL_DB_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
]);

function assertLocalDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error("DATABASE_URL is required and must point to a local database.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  }

  if (!LOCAL_DB_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Refusing to import into non-local database host "${parsed.hostname}". ` +
        "Use a local PostgreSQL database only.",
    );
  }

  const lower = rawUrl.toLowerCase();
  const blockedMarkers = ["replit", "neon.tech", "production", "prod"];
  const foundMarker = blockedMarkers.find((marker) => lower.includes(marker));
  if (foundMarker) {
    throw new Error(
      `Refusing to import because DATABASE_URL contains "${foundMarker}".`,
    );
  }

  return rawUrl;
}

function validateAppData(value: unknown): AppData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Input JSON must be an object.");
  }

  const record = value as Record<string, unknown>;
  const data = {} as AppData;

  for (const key of COLLECTIONS) {
    const collection = record[key];
    if (!Array.isArray(collection)) {
      throw new Error(`Input JSON is missing array collection "${key}".`);
    }
    data[key] = collection;
  }

  return data;
}

async function main() {
  assertLocalDatabaseUrl(process.env.DATABASE_URL);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const defaultInput = path.resolve(
    __dirname,
    "../../backups/production-appdata-2026-07-18.json",
  );
  const inputPath = path.resolve(process.argv[2] ?? defaultInput);

  const raw = await readFile(inputPath, "utf8");
  const data = validateAppData(JSON.parse(raw));

  const { db, appDataTable } = await import("@workspace/db");

  await db.transaction(async (tx) => {
    for (const key of COLLECTIONS) {
      await tx
        .insert(appDataTable)
        .values({ key, value: data[key] })
        .onConflictDoUpdate({
          target: appDataTable.key,
          set: { value: data[key], updatedAt: new Date() },
        });
    }
  });

  const rows = await db
    .select()
    .from(appDataTable)
    .where(eq(appDataTable.key, "guards"));

  const counts = Object.fromEntries(
    COLLECTIONS.map((key) => [key, data[key].length]),
  );

  console.log("Imported app data into local database only.");
  console.log(`Input: ${inputPath}`);
  console.log(`Counts: ${JSON.stringify(counts)}`);
  console.log(`Verification rows for guards key: ${rows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

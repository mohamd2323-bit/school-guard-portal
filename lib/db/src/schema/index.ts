import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Generic key/value store for all app collections.
 * Each row stores one collection (guards, schools, needs, tickets, operations,
 * violations, employees) as a JSON array under its key.
 */
export const appDataTable = pgTable("app_data", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().$default(() => []),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

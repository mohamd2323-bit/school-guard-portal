import { Router, type IRouter } from "express";
import { db, appDataTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

type TicketRecord = {
  id: string;
  ticketNumber: string;
  externalId?: string;
  source?: "البوابة" | "منصة الدعم الموحد";
  reporterName?: string;
  schoolId: string | null;
  schoolName: string;
  governorate: string;
  principalName: string;
  principalPhone: string;
  ticketType: string;
  problem?: string;
  description: string;
  status: string;
  priority?: string;
  ticketDate: string;
  resolvedAt?: string;
  actions: string;
  assignedTo?: string;
  lastSyncedAt?: string;
  createdAt: string;
};

type ExternalTicket = Record<string, unknown>;

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function firstString(record: ExternalTicket, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return "";
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getTickets(): Promise<TicketRecord[]> {
  const rows = await db.select().from(appDataTable).where(eq(appDataTable.key, "tickets"));
  const value = rows[0]?.value;
  return Array.isArray(value) ? (value as TicketRecord[]) : [];
}

async function setTickets(tickets: TicketRecord[]) {
  await db
    .insert(appDataTable)
    .values({ key: "tickets", value: tickets })
    .onConflictDoUpdate({
      target: appDataTable.key,
      set: { value: tickets, updatedAt: new Date() },
    });
}

function normalizeStatus(value: string) {
  if (["مغلق", "closed", "resolved", "done"].includes(value.toLowerCase())) return "مغلق";
  if (["تحت الإجراء", "قيد المعالجة", "in progress", "processing", "pending"].includes(value.toLowerCase())) return "تحت الإجراء";
  return "جديد";
}

function normalizeType(value: string) {
  if (value.includes("صيانة") || value.toLowerCase().includes("maintenance")) return "طلب صيانة";
  if (value.includes("دعم") || value.toLowerCase().includes("support")) return "طلب دعم فني";
  if (value.includes("حادث") || value.toLowerCase().includes("incident")) return "بلاغ حادثة";
  if (value.includes("متابعة") || value.toLowerCase().includes("follow")) return "متابعة";
  if (value.includes("شكوى") || value.toLowerCase().includes("complaint")) return "شكوى";
  return "أخرى";
}

function normalizePriority(value: string) {
  const normalized = value.toLowerCase();
  if (["حرج", "critical", "urgent"].includes(normalized)) return "حرج";
  if (["عالي", "high"].includes(normalized)) return "عالي";
  if (["منخفض", "low"].includes(normalized)) return "منخفض";
  return "متوسط";
}

function normalizeDate(value: string) {
  if (!value) return new Date().toISOString().split("T")[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().split("T")[0];
}

function mapExternalTicket(record: ExternalTicket): TicketRecord {
  const externalId = firstString(record, ["id", "ticketId", "requestId", "number", "ticketNumber"]);
  const ticketNumber = firstString(record, ["ticketNumber", "number", "requestNumber", "id"]) || `US-${genId()}`;
  const status = normalizeStatus(firstString(record, ["status", "state", "الحالة"]));
  const ticketDate = normalizeDate(firstString(record, ["ticketDate", "createdAt", "created_at", "date", "تاريخ البلاغ"]));

  return {
    id: `unified-${externalId || genId()}`,
    ticketNumber,
    externalId,
    source: "منصة الدعم الموحد",
    reporterName: firstString(record, ["reporterName", "requester", "createdBy", "مقدم البلاغ"]),
    schoolId: null,
    schoolName: firstString(record, ["schoolName", "school", "organization", "المدرسة"]) || "غير محدد",
    governorate: firstString(record, ["governorate", "city", "region", "المحافظة"]),
    principalName: firstString(record, ["principalName", "managerName", "مدير المدرسة"]),
    principalPhone: firstString(record, ["principalPhone", "phone", "mobile", "الجوال"]),
    ticketType: normalizeType(firstString(record, ["ticketType", "type", "category", "نوع البلاغ"])),
    problem: firstString(record, ["problem", "title", "subject", "المشكلة"]),
    description: firstString(record, ["description", "details", "body", "الوصف"]),
    status,
    priority: normalizePriority(firstString(record, ["priority", "urgency", "الأولوية"])),
    ticketDate,
    resolvedAt: status === "مغلق" ? normalizeDate(firstString(record, ["resolvedAt", "closedAt", "closed_at", "تاريخ المعالجة"])) : "",
    actions: firstString(record, ["actions", "resolution", "lastAction", "المعالجة"]),
    assignedTo: firstString(record, ["assignedTo", "assignee", "owner", "المسند إليه"]),
    lastSyncedAt: new Date().toISOString(),
    createdAt: ticketDate,
  };
}

function extractExternalTickets(payload: unknown): ExternalTicket[] {
  if (Array.isArray(payload)) return payload.filter((item): item is ExternalTicket => item !== null && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["tickets", "data", "items", "requests", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is ExternalTicket => item !== null && typeof item === "object");
  }
  return [];
}

router.post("/unified-support/sync", async (req, res) => {
  const apiUrl = process.env.UNIFIED_SUPPORT_API_URL;
  const token = process.env.UNIFIED_SUPPORT_API_TOKEN;
  const assignee = process.env.UNIFIED_SUPPORT_ASSIGNEE;

  if (!apiUrl || !token) {
    res.status(501).json({
      error: "مزامنة منصة الدعم الموحد غير مفعلة. أضف UNIFIED_SUPPORT_API_URL و UNIFIED_SUPPORT_API_TOKEN في إعدادات الخادم.",
    });
    return;
  }

  try {
    const url = new URL(apiUrl);
    if (assignee) url.searchParams.set("assignedTo", assignee);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: `تعذر جلب البلاغات من منصة الدعم الموحد: HTTP ${response.status}` });
      return;
    }

    const payload = await response.json();
    const externalTickets = extractExternalTickets(payload).map(mapExternalTicket);
    const existingTickets = await getTickets();
    const byKey = new Map(existingTickets.map((ticket) => [ticket.externalId || ticket.ticketNumber, ticket]));

    let imported = 0;
    let updated = 0;

    for (const ticket of externalTickets) {
      const key = ticket.externalId || ticket.ticketNumber;
      const existing = byKey.get(key);
      if (existing) {
        byKey.set(key, { ...existing, ...ticket, id: existing.id });
        updated += 1;
      } else {
        byKey.set(key, ticket);
        imported += 1;
      }
    }

    await setTickets(Array.from(byKey.values()));
    res.json({ ok: true, imported, updated, total: externalTickets.length });
  } catch (err) {
    req.log.error({ err }, "POST /unified-support/sync failed");
    res.status(500).json({ error: "حدث خطأ أثناء مزامنة بلاغات منصة الدعم الموحد." });
  }
});

export default router;

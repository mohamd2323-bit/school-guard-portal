import * as XLSX from "xlsx";
import type { School, Ticket, TicketPriority, TicketStatus, TicketType } from "../types";

type CellValue = string | number;
type Row = CellValue[];

const TICKETS_SHEET = "البلاغات";
const SUMMARY_SHEET = "ملخص";
const LISTS_SHEET = "القوائم";

const TICKET_HEADERS = [
  "رقم البلاغ",
  "مقدم البلاغ",
  "المشكلة",
  "المدرسة",
  "نوع البلاغ",
  "تاريخ البلاغ",
  "وصف البلاغ",
  "المعالجة",
  "الحالة",
  "الأولوية",
  "مدة المتابعة",
  "التصنيف المقترح",
  "المحافظة",
];

const TICKET_TYPES: TicketType[] = ["شكوى", "طلب صيانة", "طلب دعم فني", "بلاغ حادثة", "متابعة", "أخرى"];
const TICKET_STATUSES: TicketStatus[] = ["جديد", "تحت الإجراء", "مغلق"];
const PRIORITIES = ["منخفض", "متوسط", "عالي", "حرج"];
const ANALYSIS_CATEGORIES = ["حساب/دخول", "شبكة/اتصال", "صلاحيات", "نظام/تعطل", "أجهزة", "بيانات", "أمن وسلامة", "أخرى"];

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().split("T")[0];
}

function daysSince(value: string) {
  if (!value) return "";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "";
  const today = new Date();
  const diff = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function daysBetween(startValue: string, endValue: string) {
  if (!startValue || !endValue) return "";
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyTicket(ticket: Ticket) {
  const text = `${ticket.ticketType} ${ticket.description} ${ticket.actions}`.toLowerCase();
  if (includesAny(text, ["دخول", "كلمة مرور", "حساب", "رمز", "تسجيل"])) return "حساب/دخول";
  if (includesAny(text, ["شبكة", "إنترنت", "انترنت", "اتصال", "واي فاي"])) return "شبكة/اتصال";
  if (includesAny(text, ["صلاحية", "مستخدم", "دور", "اعتماد"])) return "صلاحيات";
  if (includesAny(text, ["عطل", "لا يعمل", "خطأ", "تعليق", "النظام"])) return "نظام/تعطل";
  if (includesAny(text, ["جهاز", "طابعة", "ماسح", "حاسب"])) return "أجهزة";
  if (includesAny(text, ["بيانات", "تحديث", "استيراد", "مزامنة"])) return "بيانات";
  if (includesAny(text, ["حادثة", "أمن", "سلامة", "بوابة", "حراسة"])) return "أمن وسلامة";
  return "أخرى";
}

function inferPriority(ticket: Ticket): TicketPriority {
  if (ticket.priority) return ticket.priority;
  const text = `${ticket.ticketType} ${ticket.description}`.toLowerCase();
  if (ticket.ticketType === "بلاغ حادثة" || includesAny(text, ["حرج", "عاجل", "حادثة", "خطر"])) return "حرج";
  if (includesAny(text, ["تعطل", "لا يعمل", "انقطاع", "متوقف", "فشل"])) return "عالي";
  if (ticket.status === "مغلق") return "منخفض";
  return "متوسط";
}

function countBy<T extends string>(items: Ticket[], label: T, getter: (ticket: Ticket) => string) {
  return [label, items.filter((ticket) => getter(ticket) === label).length] as Row;
}

function topCounts(items: Ticket[], getter: (ticket: Ticket) => string, limit = 10) {
  const counts = new Map<string, number>();
  items.forEach((ticket) => {
    const key = getter(ticket) || "غير محدد";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))
    .slice(0, limit);
}

function calculateColumnWidths(headers: string[], rows: Row[]) {
  return headers.map((header, index) => {
    const values = rows.map((row) => String(row[index] ?? ""));
    const longest = Math.max(header.length, ...values.map((value) => value.length));
    return { wch: Math.min(Math.max(longest + 3, 12), index === 6 || index === 7 ? 45 : 24) };
  });
}

function applyWorksheetFormatting(ws: XLSX.WorkSheet, headers: string[], rows: Row[]) {
  const lastColumn = Math.max(headers.length - 1, 0);
  const lastRow = Math.max(rows.length, 0);

  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastColumn },
    }),
  };
  ws["!cols"] = calculateColumnWidths(headers, rows);
  (ws as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
  (ws as XLSX.WorkSheet & { "!dir"?: string })["!dir"] = "rtl";
}

function appendSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: Row[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  applyWorksheetFormatting(ws, headers, rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function buildTicketRows(tickets: Ticket[]) {
  return tickets.map((ticket) => [
    ticket.ticketNumber,
    ticket.reporterName || ticket.principalName,
    ticket.problem || ticket.ticketType,
    ticket.schoolName,
    ticket.ticketType,
    formatDate(ticket.ticketDate),
    ticket.description,
    ticket.actions,
    ticket.status,
    inferPriority(ticket),
    ticket.resolvedAt ? daysBetween(ticket.ticketDate, ticket.resolvedAt) : ticket.status === "مغلق" ? "" : daysSince(ticket.ticketDate),
    classifyTicket(ticket),
    ticket.governorate,
  ]);
}

function buildSummaryRows(tickets: Ticket[]) {
  const openCount = tickets.filter((ticket) => ticket.status !== "مغلق").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "مغلق").length;
  const avgOpenDays =
    openCount === 0
      ? 0
      : tickets
          .filter((ticket) => ticket.status !== "مغلق")
          .reduce((sum, ticket) => sum + Number(daysSince(ticket.ticketDate) || 0), 0) / openCount;

  const rows: Row[] = [
    ["المؤشر", "القيمة"],
    ["إجمالي البلاغات", tickets.length],
    ["المغلقة", closedCount],
    ["المفتوحة", openCount],
    ["متوسط مدة متابعة البلاغات المفتوحة", Number(avgOpenDays.toFixed(1))],
    ["نسبة الإغلاق", tickets.length ? `${Math.round((closedCount / tickets.length) * 100)}%` : "0%"],
    [],
    ["حسب الحالة", "العدد"],
    ...TICKET_STATUSES.map((status) => countBy(tickets, status, (ticket) => ticket.status)),
    [],
    ["حسب نوع البلاغ", "العدد"],
    ...TICKET_TYPES.map((type) => countBy(tickets, type, (ticket) => ticket.ticketType)),
    [],
    ["حسب التصنيف المقترح", "العدد"],
    ...ANALYSIS_CATEGORIES.map((category) => countBy(tickets, category, classifyTicket)),
    [],
    ["أكثر المدارس بلاغات", "العدد"],
    ...topCounts(tickets, (ticket) => ticket.schoolName),
    [],
    ["أكثر المحافظات بلاغات", "العدد"],
    ...topCounts(tickets, (ticket) => ticket.governorate),
  ];

  return rows;
}

function buildListsRows(schools: School[]) {
  const schoolNames = Array.from(new Set(schools.map((school) => school.name).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ar"),
  );
  const maxRows = Math.max(TICKET_TYPES.length, TICKET_STATUSES.length, PRIORITIES.length, ANALYSIS_CATEGORIES.length, schoolNames.length);
  const rows: Row[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    rows.push([
      TICKET_TYPES[index] ?? "",
      TICKET_STATUSES[index] ?? "",
      PRIORITIES[index] ?? "",
      ANALYSIS_CATEGORIES[index] ?? "",
      schoolNames[index] ?? "",
    ]);
  }

  return rows;
}

export function buildTicketsWorkbook(tickets: Ticket[], schools: School[]) {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  appendSheet(wb, TICKETS_SHEET, TICKET_HEADERS, buildTicketRows(tickets));
  appendSheet(wb, SUMMARY_SHEET, ["البند", "العدد"], buildSummaryRows(tickets));
  appendSheet(wb, LISTS_SHEET, ["أنواع البلاغ", "حالات البلاغ", "الأولوية", "تصنيفات التحليل", "المدارس"], buildListsRows(schools));

  return wb;
}

export function exportTicketsWorkbook(tickets: Ticket[], schools: School[]) {
  const workbook = buildTicketsWorkbook(tickets, schools);
  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `تحليل-بلاغات-الدعم-الموحد-${date}.xlsx`);
}

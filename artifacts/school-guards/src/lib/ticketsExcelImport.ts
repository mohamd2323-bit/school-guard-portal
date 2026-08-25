import * as XLSX from "xlsx";
import type { School, Ticket, TicketPriority, TicketStatus, TicketType } from "../types";

type ImportRow = Record<string, unknown>;

const STATUS_VALUES: TicketStatus[] = ["جديد", "تحت الإجراء", "مغلق"];
const TYPE_VALUES: TicketType[] = ["شكوى", "طلب صيانة", "طلب دعم فني", "بلاغ حادثة", "متابعة", "أخرى"];
const PRIORITY_VALUES: TicketPriority[] = ["منخفض", "متوسط", "عالي", "حرج"];

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeKey(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/[ـ_:：]/g, "")
    .trim();
}

function getValue(row: ImportRow, labels: string[]) {
  const entries = Object.entries(row);
  for (const label of labels) {
    const wanted = normalizeKey(label);
    const match = entries.find(([key]) => normalizeKey(key) === wanted);
    if (match && match[1] !== null && match[1] !== undefined) return String(match[1]).trim();
  }
  return "";
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function rowsFromSingleColumnCsv(sheet: XLSX.WorkSheet): ImportRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const lines = matrix
    .map((row) => String(row[0] ?? "").trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2 || !lines[0].includes(",")) return [];

  const headers = parseCsvLine(lines[0]);
  if (headers.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<ImportRow>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

function normalizeDate(value: string) {
  if (!value) return new Date().toISOString().split("T")[0];
  const isoLike = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().split("T")[0];

  const hijriLike = value.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (hijriLike) return value;
  return value;
}

function normalizeStatus(value: string): TicketStatus {
  if (STATUS_VALUES.includes(value as TicketStatus)) return value as TicketStatus;
  if (value.includes("مغلق") || value.toLowerCase().includes("closed")) return "مغلق";
  if (value.includes("إجراء") || value.includes("معالجة") || value.toLowerCase().includes("progress")) return "تحت الإجراء";
  return "جديد";
}

function normalizeType(value: string): TicketType {
  if (TYPE_VALUES.includes(value as TicketType)) return value as TicketType;
  if (value.includes("صيانة")) return "طلب صيانة";
  if (value.includes("دعم")) return "طلب دعم فني";
  if (value.includes("حادث")) return "بلاغ حادثة";
  if (value.includes("متابعة")) return "متابعة";
  if (value.includes("شكوى")) return "شكوى";
  return "أخرى";
}

function normalizePriority(value: string): TicketPriority {
  if (PRIORITY_VALUES.includes(value as TicketPriority)) return value as TicketPriority;
  if (value.includes("حرج") || value.includes("عاجل")) return "حرج";
  if (value.includes("عالي")) return "عالي";
  if (value.includes("منخفض")) return "منخفض";
  return "متوسط";
}

function findSchool(schools: School[], schoolName: string) {
  const normalized = normalizeKey(schoolName);
  return schools.find((school) => normalizeKey(school.name) === normalized);
}

function makeTicket(row: ImportRow, schools: School[]): Ticket | null {
  const ticketNumber = getValue(row, [
    "رقم البلاغ",
    "رقم التذكرة",
    "معرف الحالة",
    "Case ID",
    "Case Number",
    "Ticket Number",
    "ID",
  ]);
  const requestNumber = getValue(row, ["معرف الطلب", "Request ID", "Request Number"]);
  const description = getValue(row, [
    "وصف البلاغ",
    "الوصف",
    "ملخص",
    "Summary",
    "Description",
    "Details",
    "التفاصيل",
  ]);
  const problem = getValue(row, ["المشكلة", "العنوان", "ملخص", "Title", "Summary", "Subject"]);
  const schoolName = getValue(row, ["المدرسة", "اسم المدرسة", "School", "School Name"]);

  const externalId = ticketNumber || requestNumber;
  if (!externalId) return null;
  if (!description && !problem && !schoolName) return null;

  const school = findSchool(schools, schoolName);
  const ticketType = normalizeType(getValue(row, ["نوع البلاغ", "النوع", "Type", "Category"]));
  const status = normalizeStatus(getValue(row, ["الحالة", "حالة البلاغ", "Status", "State"]));
  const assignedGroup = getValue(row, ["المجموعة المعينة", "Assigned Group", "Group"]);
  const ticketDate = normalizeDate(getValue(row, [
    "تاريخ البلاغ",
    "تاريخ الإبلاغ",
    "تاريخ التعديل",
    "Created Date",
    "Create Date",
    "Modified Date",
    "Date",
  ]));

  return {
    id: `imported-${externalId || genId()}`,
    ticketNumber: externalId,
    externalId,
    source: "منصة الدعم الموحد",
    reporterName: getValue(row, ["مقدم البلاغ", "طالب الخدمة", "Requester", "Requested By", "Submitter"]),
    schoolId: school?.id ?? null,
    schoolName: school?.name ?? (schoolName || "غير محدد"),
    governorate: school?.governorate ?? (getValue(row, ["المحافظة", "المدينة", "Governorate", "Region", "City"]) || "غير محدد"),
    principalName: school?.principalName ?? getValue(row, ["مدير المدرسة", "اسم المدير", "Principal"]),
    principalPhone: school?.principalPhone ?? getValue(row, ["جوال المدير", "رقم الجوال", "Phone", "Mobile"]),
    ticketType,
    problem: problem || ticketType,
    description: description || problem || ticketType,
    status,
    priority: normalizePriority(getValue(row, ["الأولوية", "Priority", "Urgency"])),
    ticketDate,
    resolvedAt: status === "مغلق" ? normalizeDate(getValue(row, ["تاريخ المعالجة", "تاريخ الإغلاق", "Resolved Date", "Closed Date"])) : "",
    actions: getValue(row, ["المعالجة", "الإجراء", "الإجراءات", "Resolution", "Action"]) || (assignedGroup ? `المجموعة المعينة: ${assignedGroup}` : ""),
    assignedTo: getValue(row, ["المسند إليه", "المكلف", "Assigned To", "Assignee", "Owner"]),
    lastSyncedAt: new Date().toISOString(),
    createdAt: ticketDate,
  };
}

export async function importTicketsFromExcel(file: File, schools: School[]) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const csvRows = rowsFromSingleColumnCsv(sheet);
  const rows = csvRows.length > 0 ? csvRows : XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "", raw: false });

  return rows
    .map((row) => makeTicket(row, schools))
    .filter((ticket): ticket is Ticket => ticket !== null);
}

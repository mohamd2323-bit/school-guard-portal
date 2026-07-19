import * as XLSX from "xlsx";
import type { Guard, School } from "../types";

type CellValue = string | number;
type Row = CellValue[];
type DataRecord = Record<string, unknown>;

const GUARDS_SHEET = "الحراس";
const SCHOOLS_SHEET = "المدارس";

const GUARD_HEADERS = [
  "اسم الحارس",
  "السجل المدني",
  "رقم الجوال",
  "جنس الحارس",
  "المسمى الوظيفي",
  "المرتبة",
  "المحافظة",
  "المدرسة الحالية",
  "نوع المدرسة",
  "اسم المدير المباشر",
  "سجل المدير",
  "جوال المدير",
];

const SCHOOL_HEADERS = [
  "المحافظة",
  "اسم المدرسة",
  "المرحلة",
  "النوع",
  "اسم المدير/ة",
  "رقم هوية/سجل المدير/ة",
  "جوال المدير/ة",
  "عدد الحراس",
];

function asRecord(value: unknown): DataRecord {
  return (value ?? {}) as DataRecord;
}

function valueFor(record: DataRecord | null | undefined, key: string): CellValue {
  if (!record) return "";
  const value = record[key];
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function firstValue(record: DataRecord | null | undefined, keys: string[]): CellValue {
  for (const key of keys) {
    const value = valueFor(record, key);
    if (value !== "") return value;
  }
  return "";
}

function isTextColumn(header: string) {
  return /(السجل|سجل|جوال|هاتف|رقم|هوية|مدني|كود|رمز|معرف|id|ID)/i.test(header);
}

function calculateColumnWidths(headers: string[], rows: Row[]) {
  return headers.map((header, index) => {
    const values = rows.map((row) => String(row[index] ?? ""));
    const longest = Math.max(header.length, ...values.map((value) => value.length));
    return { wch: Math.min(Math.max(longest + 3, 12), index === 5 ? 55 : 28) };
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

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (headerCell) {
      headerCell.s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "9DC3E6" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
    }

    if (!isTextColumn(headers[c] ?? "")) continue;
    for (let r = 1; r <= range.e.r; r += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === "") continue;
      cell.t = "s";
      cell.z = "@";
      cell.v = String(cell.v);
    }
  }
}

function appendSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: Row[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  applyWorksheetFormatting(ws, headers, rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function buildSchoolMap(schools: School[]) {
  return new Map(schools.map((school) => [school.id, school]));
}

function buildGuardsBySchool(guards: Guard[]) {
  const guardsBySchool = new Map<string, Guard[]>();
  guards.forEach((guard) => {
    if (!guard.schoolId) return;
    const list = guardsBySchool.get(guard.schoolId) ?? [];
    list.push(guard);
    guardsBySchool.set(guard.schoolId, list);
  });
  return guardsBySchool;
}

function buildGuardRows(schools: School[], guards: Guard[]) {
  const schoolsById = buildSchoolMap(schools);

  return guards.map((guard) => {
    const guardRecord = asRecord(guard);
    const school = guard.schoolId ? schoolsById.get(guard.schoolId) : undefined;
    const schoolRecord = asRecord(school);

    return [
      valueFor(guardRecord, "name"),
      firstValue(guardRecord, ["nationalId", "civilId"]),
      firstValue(guardRecord, ["phone", "mobile"]),
      valueFor(guardRecord, "gender"),
      firstValue(guardRecord, ["jobTitle", "jobType", "appointmentCategory"]),
      valueFor(guardRecord, "rank"),
      firstValue(schoolRecord, ["governorate"]) || valueFor(guardRecord, "governorate"),
      firstValue(guardRecord, ["schoolName"]) || valueFor(schoolRecord, "name"),
      valueFor(schoolRecord, "type"),
      valueFor(schoolRecord, "principalName"),
      firstValue(schoolRecord, ["principalNationalId", "principalCivilId"]),
      firstValue(schoolRecord, ["principalPhone", "principalMobile"]),
    ];
  });
}

function buildSchoolRows(schools: School[], guards: Guard[]) {
  const guardsBySchool = buildGuardsBySchool(guards);

  return schools.map((school) => {
    const schoolRecord = asRecord(school);
    return [
      valueFor(schoolRecord, "governorate"),
      valueFor(schoolRecord, "name"),
      valueFor(schoolRecord, "level"),
      valueFor(schoolRecord, "type"),
      valueFor(schoolRecord, "principalName"),
      firstValue(schoolRecord, ["principalNationalId", "principalCivilId"]),
      firstValue(schoolRecord, ["principalPhone", "principalMobile"]),
      guardsBySchool.get(school.id)?.length ?? 0,
    ];
  });
}

export function buildSchoolsWorkbook(schools: School[], guards: Guard[]) {
  const guardRows = buildGuardRows(schools, guards);
  const schoolRows = buildSchoolRows(schools, guards);
  const wb = XLSX.utils.book_new();

  wb.Workbook = {
    Views: [{ RTL: true }],
  };

  appendSheet(wb, GUARDS_SHEET, GUARD_HEADERS, guardRows);
  appendSheet(wb, SCHOOLS_SHEET, SCHOOL_HEADERS, schoolRows);

  return {
    workbook: wb,
    summaryRows: schoolRows,
    guardRows,
    summaryHeaders: SCHOOL_HEADERS,
    guardHeaders: GUARD_HEADERS,
    maxGuards: Math.max(0, ...Array.from(buildGuardsBySchool(guards).values(), (list) => list.length)),
  };
}

export function exportSchoolsWorkbook(schools: School[], guards: Guard[]) {
  const { workbook } = buildSchoolsWorkbook(schools, guards);
  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `قائمة-الحراس-${date}.xlsx`);
}

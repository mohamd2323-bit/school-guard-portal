import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useStore, useBackups, saveBackupSnapshot, restoreBackupSnapshot, deleteBackupSnapshot } from "../store/useStore";
import type { Guard, School, ImportSummary } from "../types";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Trash2,
  Info,
  FlaskConical,
  XCircle,
  Files,
  File,
  Save,
  Ban,
  RotateCcw,
  DatabaseBackup,
  Download,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).trim();
}

/**
 * Normalize a column name for fuzzy matching:
 * - lowercase
 * - strip spaces, slashes, dashes, dots, Arabic punctuation, parentheses
 */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[\s/\-_.،؟!()[\]]/g, "");
}

/**
 * Build a lookup map: normKey(columnName) → original column name.
 * Built once per row (columns are identical across all rows).
 */
function buildColMap(row: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  for (const k of Object.keys(row)) {
    map.set(normKey(k), k);
  }
  return map;
}

/**
 * Smart pick: find a non-empty cell whose column name fuzzy-matches any keyword.
 * Matching rules (tried in order):
 *  1. Exact normalized match
 *  2. Normalized column contains normalized keyword
 *  3. Normalized keyword contains normalized column
 */
function pick(row: Record<string, unknown>, colMap: Map<string, string>, ...keywords: string[]): string {
  for (const kw of keywords) {
    const nkw = normKey(kw);

    // 1. Exact
    const exact = colMap.get(nkw);
    if (exact !== undefined) {
      const v = normalizeStr(row[exact]);
      if (v) return v;
    }

    // 2 & 3. Substring match
    for (const [nCol, origCol] of colMap) {
      if (nCol.includes(nkw) || nkw.includes(nCol)) {
        const v = normalizeStr(row[origCol]);
        if (v) return v;
      }
    }
  }
  return "";
}

/** Find a worksheet by matching any keyword (Arabic or English) against sheet names */
function findSheet(
  wb: XLSX.WorkBook,
  arabicKeywords: string[],
  englishKeywords: string[],
  fallbackIndex?: number,
): XLSX.WorkSheet | null {
  const found = wb.SheetNames.find((n) => {
    const lower = n.trim().toLowerCase();
    const trimmed = n.trim();
    return (
      englishKeywords.some((k) => lower.includes(k)) ||
      arabicKeywords.some((k) => trimmed.includes(k))
    );
  });
  if (found) return wb.Sheets[found];
  if (fallbackIndex !== undefined && wb.SheetNames[fallbackIndex]) {
    return wb.Sheets[wb.SheetNames[fallbackIndex]];
  }
  return null;
}

const SCHOOL_AR = ["مدرسة", "مدارس", "المدارس", "School", "Schools"];
const SCHOOL_EN = ["school"];
const GUARD_AR = ["حارس", "حراس", "الحراس", "Guard", "Guards"];
const GUARD_EN = ["guard"];

// ─── Core parsing ────────────────────────────────────────────────────────────

function parseSchools(ws: XLSX.WorkSheet): { schools: School[]; errors: string[] } {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const schools: School[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const cm = buildColMap(row);

    // School name — look for "مدرسة" or "school" fragment
    const name = pick(row, cm,
      "اسم المدرسة", "المدرسة", "مدرسة", "school name", "school_name", "school",
    );
    if (!name) {
      errors.push(`مدرسة - الصف ${i + 2}: اسم المدرسة مفقود`);
      return;
    }

    const typeRaw = pick(row, cm, "النوع", "نوع المدرسة", "جنس المدرسة", "type");
    let type: School["type"] = "بنين";
    if (typeRaw.includes("بنات") || typeRaw.toLowerCase().includes("girl")) type = "بنات";
    else if (typeRaw.includes("مختلط") || typeRaw.toLowerCase().includes("mix")) type = "مختلط";

    schools.push({
      id: generateId(),
      name,
      governorate: pick(row, cm,
        "المحافظة", "محافظة", "governorate", "district",
      ),
      level: pick(row, cm,
        "المرحلة", "المرحلة الدراسية", "مرحلة", "level", "stage",
      ),
      type,
      // Principal name: any column containing "مدير" or "مديرة" + "اسم"
      principalName: pick(row, cm,
        "اسم المديرة", "اسم المدير", "المديرة", "المدير",
        "principal name", "principal_name",
      ),
      // Principal ID: any column with "سجل" or "هوية" near "مدير"
      principalNationalId: pick(row, cm,
        "سجل المديرة", "سجل المدير", "رقم هوية المديرة", "رقم هوية المدير",
        "هوية المدير", "هوية المديرة", "principal id", "principal_id",
      ),
      // Principal phone: any column with "جوال" or "هاتف" near "مدير"
      principalPhone: pick(row, cm,
        "جوال المديرة", "جوال المدير", "رقم جوال المديرة", "رقم جوال المدير",
        "هاتف المدير", "هاتف المديرة", "principal phone", "principal_phone",
      ),
    });
  });

  return { schools, errors };
}

function parseGuards(
  ws: XLSX.WorkSheet,
  linkedSchools: School[],
): { guards: Guard[]; errors: string[]; linkedCount: number } {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const guards: Guard[] = [];
  const errors: string[] = [];
  let linkedCount = 0;

  rows.forEach((row, i) => {
    const cm = buildColMap(row);

    const name = pick(row, cm,
      "اسم الحارس", "اسم الحارسة", "اسم الموظف", "الاسم الكامل", "الاسم",
      "guard name", "full name", "name",
    );
    if (!name) {
      errors.push(`حارس - الصف ${i + 2}: اسم الحارس مفقود`);
      return;
    }

    // Link fields — use same fuzzy logic as schools parser
    const principalIdInRow = pick(row, cm,
      "سجل المديرة", "سجل المدير", "رقم هوية المديرة", "رقم هوية المدير",
      "هوية المدير", "هوية المديرة", "principal id", "principal_id",
    );
    const principalNameInRow = pick(row, cm,
      "اسم المديرة", "اسم المدير", "المديرة", "المدير",
      "principal name", "principal_name",
    );
    const schoolNameInRow = pick(row, cm,
      "اسم المدرسة", "المدرسة", "مدرسة", "school name", "school_name", "school",
    );

    let linkedSchool: School | undefined;
    if (principalIdInRow) linkedSchool = linkedSchools.find((s) => s.principalNationalId === principalIdInRow);
    if (!linkedSchool && principalNameInRow) linkedSchool = linkedSchools.find((s) => s.principalName === principalNameInRow);
    if (!linkedSchool && schoolNameInRow) linkedSchool = linkedSchools.find((s) => s.name === schoolNameInRow);
    if (linkedSchool) linkedCount++;

    const genderRaw = pick(row, cm, "الجنس", "جنس الحارس", "gender");
    const gender: Guard["gender"] =
      genderRaw.includes("أنثى") || genderRaw.toLowerCase().includes("female") || genderRaw === "ف"
        ? "أنثى"
        : "ذكر";

    const statusRaw = pick(row, cm, "الحالة", "حالة الحارس", "status");
    const status: Guard["status"] =
      statusRaw.includes("غير") || statusRaw.toLowerCase().includes("inactive")
        ? "غير نشط"
        : "نشط";

    guards.push({
      id: generateId(),
      name,
      nationalId: pick(row, cm,
        "السجل المدني", "رقم السجل المدني", "رقم الهوية", "هوية الحارس",
        "national id", "national_id",
      ),
      phone: pick(row, cm,
        "رقم الجوال", "جوال الحارس", "الجوال", "رقم الهاتف", "هاتف",
        "phone",
      ),
      gender,
      status,
      jobType: pick(row, cm,
        "نوع الوظيفة", "نوع العقد", "job type", "job_type",
      ) || undefined,
      jobTitle: pick(row, cm,
        "المسمى الوظيفي", "المسمى", "الوظيفة", "job title", "job_title",
      ) || undefined,
      rank: pick(row, cm,
        "المرتبة", "الدرجة", "المرتبة/الدرجة", "الدرجة الوظيفية",
        "rank", "grade",
      ) || undefined,
      appointmentCategory: pick(row, cm,
        "فئة التعيين", "فئة", "appointment category", "appointment_category",
      ) || undefined,
      region: pick(row, cm,
        "المنطقة", "region",
      ) || undefined,
      governorate: pick(row, cm,
        "المحافظة", "محافظة", "governorate",
      ) || linkedSchool?.governorate || undefined,
      schoolId: linkedSchool?.id ?? null,
      schoolName: linkedSchool?.name ?? null,
    });
  });

  return { guards, errors, linkedCount };
}

// ─── Process a workbook — try to extract schools and guards sheets ────────────

function processWorkbook(
  wb: XLSX.WorkBook,
  existingSchools: School[] = [],
): {
  schools: School[];
  guards: Guard[];
  linkedCount: number;
  errors: string[];
  foundSchoolSheet: boolean;
  foundGuardSheet: boolean;
} {
  const errors: string[] = [];
  let schools: School[] = [...existingSchools];
  let guards: Guard[] = [];
  let linkedCount = 0;
  let foundSchoolSheet = false;
  let foundGuardSheet = false;

  const schoolWs = findSheet(wb, SCHOOL_AR, SCHOOL_EN, existingSchools.length === 0 ? 0 : undefined);
  if (schoolWs) {
    const result = parseSchools(schoolWs);
    schools = [...existingSchools, ...result.schools];
    errors.push(...result.errors);
    foundSchoolSheet = true;
  } else if (existingSchools.length === 0) {
    errors.push("لم يُعثر على ورقة المدارس — جرّب تسمية الورقة: Schools أو مدارس");
  }

  const guardWs = findSheet(wb, GUARD_AR, GUARD_EN, existingSchools.length > 0 ? 0 : 1);
  if (guardWs) {
    const result = parseGuards(guardWs, schools);
    guards = result.guards;
    linkedCount = result.linkedCount;
    errors.push(...result.errors);
    foundGuardSheet = true;
  } else {
    errors.push("لم يُعثر على ورقة الحراس — جرّب تسمية الورقة: Guards أو حراس");
  }

  return { schools: schools.filter((s) => !existingSchools.includes(s)), guards, linkedCount, errors, foundSchoolSheet, foundGuardSheet };
}

// ─── Drop zone sub-component ─────────────────────────────────────────────────

function DropZone({
  label,
  hint,
  icon: Icon,
  file,
  onFile,
  accept = ".xlsx,.xls",
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  file: File | null;
  onFile: (f: File) => void;
  accept?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
        ${dragOver ? "border-primary bg-primary/5" : file ? "border-green-400 bg-green-50" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); if (ref.current) ref.current.value = ""; }} />
      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center
          ${file ? "bg-green-100" : "bg-primary/10"}`}>
          {file ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Icon className="w-6 h-6 text-primary" />}
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{label}</p>
          {file ? (
            <p className="text-green-700 text-xs mt-0.5 font-medium">{file.name}</p>
          ) : (
            <p className="text-muted-foreground text-xs mt-0.5">{hint}</p>
          )}
        </div>
        {!file && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded">.xlsx</span>
            <span className="bg-muted px-2 py-0.5 rounded">.xls</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Pending import — parsed but not yet committed
type PendingImport = {
  guards: Guard[];
  schools: School[];
  summary: ImportSummary;
};

export default function DataManagement() {
  const { importData, clearData, clearDemoData, loadDemoData, hasData, hasDemoData, hasRealData, guards, schools, needs, operations, violations } = useStore();

  const [mode, setMode] = useState<"single" | "dual">("single");
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const singleRef = useRef<HTMLInputElement>(null);

  const [backupSaveMsg, setBackupSaveMsg] = useState<"success" | "error" | null>(null);
  const [backupRestoreMsg, setBackupRestoreMsg] = useState<"success" | "noBackup" | null>(null);
  const [restoredIndex, setRestoredIndex] = useState<number | null>(null);
  const snapshots = useBackups();

  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportSheets, setExportSheets] = useState({
    guards: true,
    schools: true,
    operations: true,
    needs: true,
    violations: true,
  });

  function toggleExportSheet(key: keyof typeof exportSheets) {
    setExportSheets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSaveBackup() {
    try {
      saveBackupSnapshot();
      setBackupSaveMsg("success");
      setTimeout(() => setBackupSaveMsg(null), 4000);
    } catch {
      setBackupSaveMsg("error");
      setTimeout(() => setBackupSaveMsg(null), 4000);
    }
  }

  function handleDeleteSnapshot(index: number) {
    deleteBackupSnapshot(index);
  }

  function handleRestoreBackup(index: number) {
    if (!confirm(`هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال البيانات الحالية.`)) return;
    const ok = restoreBackupSnapshot(index);
    if (ok) {
      setRestoredIndex(index);
      setBackupRestoreMsg("success");
      setTimeout(() => { setBackupRestoreMsg(null); setRestoredIndex(null); }, 4000);
    } else {
      setBackupRestoreMsg("noBackup");
      setTimeout(() => setBackupRestoreMsg(null), 4000);
    }
  }

  const hasExportData =
    guards.length > 0 ||
    schools.length > 0 ||
    operations.length > 0 ||
    needs.length > 0 ||
    violations.length > 0;

  function handleExport() {
    const anySelected = Object.values(exportSheets).some(Boolean);
    if (!anySelected) return;

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wb = XLSX.utils.book_new();

    if (exportSheets.guards) {
      const guardsData = guards.map((g) => ({
        "الاسم": g.name,
        "السجل المدني": g.nationalId,
        "رقم الجوال": g.phone,
        "الجنس": g.gender,
        "الحالة": g.status,
        "نوع الوظيفة": g.jobType ?? "",
        "المسمى الوظيفي": g.jobTitle ?? "",
        "المرتبة": g.rank ?? "",
        "فئة التعيين": g.appointmentCategory ?? "",
        "المنطقة": g.region ?? "",
        "المحافظة": g.governorate ?? "",
        "اسم المدرسة المرتبطة": g.schoolName ?? "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guardsData), "الحراس");
    }

    if (exportSheets.schools) {
      const schoolsData = schools.map((s) => ({
        "اسم المدرسة": s.name,
        "المحافظة": s.governorate,
        "المرحلة الدراسية": s.level,
        "نوع المدرسة": s.type,
        "اسم المدير/ة": s.principalName,
        "سجل المدير/ة": s.principalNationalId,
        "جوال المدير/ة": s.principalPhone,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schoolsData), "المدارس");
    }

    if (exportSheets.operations) {
      const operationsData = operations.map((op) => ({
        "نوع العملية": op.type,
        "الحارس": op.guardName,
        "التاريخ": op.date,
        "ملاحظات": op.notes,
        "منفذ بواسطة": op.performedBy ?? "",
        "حالة التكليف": op.assignmentStatus ?? "",
        "تاريخ الإنشاء": op.createdAt,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(operationsData), "العمليات");
    }

    if (exportSheets.needs) {
      const needsData = needs.map((n) => ({
        "اسم المدرسة": n.schoolName,
        "المحافظة": n.governorate,
        "اسم المدير/ة": n.principalName,
        "سجل المدير/ة": n.principalNationalId,
        "جوال المدير/ة": n.principalPhone,
        "نوع الحاجة": n.needType,
        "السبب": n.reason,
        "تاريخ الطلب": n.requestDate,
        "الحالة": n.status,
        "تاريخ الإنشاء": n.createdAt,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(needsData), "الاحتياجات");
    }

    if (exportSheets.violations) {
      const violationsData = violations.map((v) => ({
        "رقم القضية": v.caseNumber,
        "النوع": v.type,
        "اسم المبلّغ": v.reporterName,
        "مصدر البلاغ": v.reporterSource,
        "اسم المدرسة": v.schoolName,
        "المحافظة": v.governorate,
        "اسم الحارس": v.guardName,
        "الوصف": v.description,
        "تاريخ الإبلاغ": v.reportDate,
        "الحالة": v.status,
        "الإجراء المتخذ": v.actionTaken,
        "ملاحظات": v.notes,
        "تاريخ الإنشاء": v.createdAt,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(violationsData), "المخالفات");
    }

    XLSX.writeFile(wb, `school-guards-export-${today}.xlsx`);
    setShowExportPanel(false);
  }

  function formatBackupDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }

  // Dual-mode state
  const [schoolsFile, setSchoolsFile] = useState<File | null>(null);
  const [guardsFile, setGuardsFile] = useState<File | null>(null);

  const demoGuardsCount = guards.filter((g) => g.isDemo).length;
  const demoSchoolsCount = schools.filter((s) => s.isDemo).length;
  const realGuardsCount = guards.filter((g) => !g.isDemo).length;
  const realSchoolsCount = schools.filter((s) => !s.isDemo).length;

  // ── Shared helpers ───────────────────────────────────────────────────────

  function readWorkbook(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(XLSX.read(e.target?.result, { type: "binary" }));
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsBinaryString(file);
    });
  }

  function commitPending() {
    if (!pending) return;
    importData(pending.guards, pending.schools);
    setPending(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 6000);
  }

  function cancelPending() {
    setPending(null);
  }

  // ── Single-file: parse only, do NOT save yet ─────────────────────────────

  async function processSingleFile(file: File) {
    setImporting(true);
    setPending(null);
    setSaved(false);
    try {
      const wb = await readWorkbook(file);
      const { schools: importedSchools, guards: importedGuards, linkedCount, errors } = processWorkbook(wb);
      setPending({
        guards: importedGuards,
        schools: importedSchools,
        summary: {
          guardsImported: importedGuards.length,
          schoolsImported: importedSchools.length,
          linkedRecords: linkedCount,
          failedRecords: errors.length,
          errors,
        },
      });
    } catch (err) {
      setPending({
        guards: [],
        schools: [],
        summary: { guardsImported: 0, schoolsImported: 0, linkedRecords: 0, failedRecords: 1, errors: ["حدث خطأ أثناء قراءة الملف: " + String(err)] },
      });
    }
    setImporting(false);
  }

  // ── Dual-file: parse only, do NOT save yet ───────────────────────────────

  async function processDualFiles() {
    if (!schoolsFile && !guardsFile) return;
    setImporting(true);
    setPending(null);
    setSaved(false);
    try {
      const allErrors: string[] = [];
      let importedSchools: School[] = [];
      let importedGuards: Guard[] = [];
      let linkedCount = 0;

      if (schoolsFile) {
        const wb = await readWorkbook(schoolsFile);
        const ws = findSheet(wb, SCHOOL_AR, SCHOOL_EN, 0);
        if (ws) {
          const r = parseSchools(ws);
          importedSchools = r.schools;
          allErrors.push(...r.errors);
        } else {
          allErrors.push("لم يُعثر على ورقة المدارس في الملف المرفوع");
        }
      }

      if (guardsFile) {
        const wb = await readWorkbook(guardsFile);
        const ws = findSheet(wb, GUARD_AR, GUARD_EN, 0);
        if (ws) {
          const r = parseGuards(ws, importedSchools);
          importedGuards = r.guards;
          linkedCount = r.linkedCount;
          allErrors.push(...r.errors);
        } else {
          allErrors.push("لم يُعثر على ورقة الحراس في الملف المرفوع");
        }
      }

      setPending({
        guards: importedGuards,
        schools: importedSchools,
        summary: {
          guardsImported: importedGuards.length,
          schoolsImported: importedSchools.length,
          linkedRecords: linkedCount,
          failedRecords: allErrors.length,
          errors: allErrors,
        },
      });
      setSchoolsFile(null);
      setGuardsFile(null);
    } catch (err) {
      setPending({
        guards: [],
        schools: [],
        summary: { guardsImported: 0, schoolsImported: 0, linkedRecords: 0, failedRecords: 1, errors: ["حدث خطأ: " + String(err)] },
      });
    }
    setImporting(false);
  }

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      <div>
        <h2 className="text-xl font-bold text-foreground">إدارة البيانات</h2>
        <p className="text-muted-foreground text-sm mt-1">
          استيراد بيانات الحراس والمدارس من ملف Excel
        </p>
      </div>

      {/* Demo data card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">البيانات التجريبية</p>
            <p className="text-amber-700 text-xs mt-1">
              {hasDemoData
                ? `يوجد حالياً ${demoGuardsCount} حارس و ${demoSchoolsCount} مدرسة تجريبية`
                : "تحميل 25 حارساً و 20 مدرسة موزعة على 6 محافظات للاختبار"}
            </p>
          </div>
          <div className="flex-shrink-0">
            {!hasDemoData ? (
              <button onClick={loadDemoData}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <FlaskConical className="w-4 h-4" />
                تحميل تجريبي
              </button>
            ) : (
              <button
                onClick={() => { if (confirm("هل أنت متأكد من حذف البيانات التجريبية؟")) clearDemoData(); }}
                className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" />
                حذف التجريبية
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Backup / Restore card ── */}
      <div className="bg-white rounded-xl border border-teal-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <p className="font-semibold text-foreground text-sm">حفظ البيانات واستعادتها</p>
          </div>
          {snapshots.length > 0 && (
            <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
              {snapshots.length} / 5 نسخ محفوظة
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveBackup}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            حفظ نسخة الآن
          </button>
          <button
            onClick={() => {
              if (!showExportPanel) {
                setExportSheets({ guards: true, schools: true, operations: true, needs: true, violations: true });
              }
              setShowExportPanel((v) => !v);
            }}
            disabled={!hasExportData}
            className={`flex items-center gap-2 border px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${showExportPanel ? "bg-teal-50 border-teal-400 text-teal-800" : "bg-white border-teal-300 text-teal-700 hover:bg-teal-50"}`}
          >
            <Download className="w-4 h-4" />
            تصدير كامل
          </button>
        </div>

        {/* Export record count summary — always visible when there is data */}
        {hasExportData && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-teal-50/70 border border-teal-100 rounded-xl px-4 py-2.5">
            <Info className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
            {(
              [
                { label: "حارس", emptyLabel: "لا يوجد حراس", count: guards.length },
                { label: "مدرسة", emptyLabel: "لا توجد مدارس", count: schools.length },
                { label: "عملية", emptyLabel: "لا توجد عمليات", count: operations.length },
                { label: "احتياج", emptyLabel: "لا توجد احتياجات", count: needs.length },
                { label: "مخالفة", emptyLabel: "لا توجد مخالفات", count: violations.length },
              ] as { label: string; emptyLabel: string; count: number }[]
            ).map(({ label, emptyLabel, count }, i, arr) => (
              <span key={label} className="flex items-center gap-1">
                {count > 0 ? (
                  <>
                    <span className="font-bold text-teal-800 text-sm">{count}</span>
                    <span className="text-teal-700 text-xs">{label}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">{emptyLabel}</span>
                )}
                {i < arr.length - 1 && <span className="text-teal-300 text-xs mx-0.5">·</span>}
              </span>
            ))}
          </div>
        )}

        {/* Export sheet selector panel */}
        {showExportPanel && (
          <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-teal-900">اختر الأوراق المراد تصديرها:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { key: "guards", label: "الحراس", count: guards.length },
                  { key: "schools", label: "المدارس", count: schools.length },
                  { key: "operations", label: "العمليات", count: operations.length },
                  { key: "needs", label: "الاحتياجات", count: needs.length },
                  { key: "violations", label: "المخالفات", count: violations.length },
                ] as { key: keyof typeof exportSheets; label: string; count: number }[]
              ).map(({ key, label, count }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none
                    ${exportSheets[key] ? "bg-white border-teal-400 text-teal-900" : "bg-white/60 border-border text-muted-foreground"}`}
                >
                  <input
                    type="checkbox"
                    checked={exportSheets[key]}
                    onChange={() => toggleExportSheet(key)}
                    className="accent-teal-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {count > 0 ? (
                    <span className="text-xs font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-md">{count}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 italic">فارغة</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleExport}
                disabled={!Object.values(exportSheets).some(Boolean)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                تنزيل ({Object.values(exportSheets).filter(Boolean).length} ورقة)
              </button>
              <button
                onClick={() => setShowExportPanel(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/80 border border-border transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {backupSaveMsg === "success" && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            تم حفظ النسخة بنجاح
          </div>
        )}
        {backupSaveMsg === "error" && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            حدث خطأ أثناء الحفظ
          </div>
        )}
        {backupRestoreMsg === "success" && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            تم استعادة البيانات بنجاح
          </div>
        )}
        {backupRestoreMsg === "noBackup" && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            لا توجد نسخة محفوظة بعد — احفظ أولاً
          </div>
        )}

        {/* Snapshot history list */}
        {snapshots.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">سجل النسخ الاحتياطية</p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {snapshots.map((snap, i) => (
                <div
                  key={snap.timestamp}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors
                    ${restoredIndex === i ? "bg-green-50" : i === 0 ? "bg-teal-50/50" : "bg-white hover:bg-muted/30"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-teal-500" : "bg-border"}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-xs truncate">
                        {formatBackupDate(snap.timestamp)}
                        {i === 0 && (
                          <span className="mr-2 text-teal-600 font-medium">(الأحدث)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(snap.data.guards?.length ?? 0)} حارس ·{" "}
                        {(snap.data.schools?.length ?? 0)} مدرسة ·{" "}
                        {(snap.data.operations?.length ?? 0)} عملية
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestoreBackup(i)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      استعادة
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(i)}
                      title="حذف هذه النسخة"
                      className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 text-center">
            لا توجد نسخ احتياطية بعد — انقر على "حفظ نسخة الآن" لإنشاء أول نسخة
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-foreground">تعليمات الاستيراد</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside marker:text-primary text-xs">
              <li>الملف الواحد يجب أن يحتوي على ورقتين: <strong>Schools</strong> (أو مدارس) و <strong>Guards</strong> (أو حراس)</li>
              <li>يمكن رفع ملفين منفصلين: ملف للمدارس وملف للحراس</li>
              <li>يتم ربط الحراس بالمدارس تلقائياً عبر: سجل المدير ← اسم المدير ← اسم المدرسة</li>
              <li>الأعمدة تُكتشف تلقائياً — عربي وإنجليزي مدعومان</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-border p-2 flex gap-2">
        <button
          onClick={() => { setMode("single"); setPending(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${mode === "single" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          <File className="w-4 h-4" />
          ملف واحد (ورقتان)
        </button>
        <button
          onClick={() => { setMode("dual"); setPending(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${mode === "dual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          <Files className="w-4 h-4" />
          ملفان منفصلان
        </button>
      </div>

      {/* ── Single file mode ── */}
      {mode === "single" && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
            ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processSingleFile(f); }}
          onClick={() => singleRef.current?.click()}
        >
          <input ref={singleRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processSingleFile(f); if (singleRef.current) singleRef.current.value = ""; }} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
            </div>
            {importing ? (
              <div className="space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground text-sm">جاري معالجة الملف...</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-foreground font-semibold text-base">اسحب ملف Excel هنا</p>
                  <p className="text-muted-foreground text-sm mt-1">ملف يحتوي على ورقة المدارس وورقة الحراس</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-1 rounded">.xlsx</span>
                  <span className="bg-muted px-2 py-1 rounded">.xls</span>
                </div>
                <button
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                  onClick={(e) => { e.stopPropagation(); singleRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4" />
                  اختر ملف Excel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Dual file mode ── */}
      {mode === "dual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DropZone
              label="ملف المدارس"
              hint="ملف يحتوي على بيانات المدارس"
              icon={FileSpreadsheet}
              file={schoolsFile}
              onFile={setSchoolsFile}
            />
            <DropZone
              label="ملف الحراس"
              hint="ملف يحتوي على بيانات الحراس"
              icon={FileSpreadsheet}
              file={guardsFile}
              onFile={setGuardsFile}
            />
          </div>

          {(schoolsFile || guardsFile) && (
            <button
              onClick={processDualFiles}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  استيراد {schoolsFile && guardsFile ? "الملفين" : schoolsFile ? "ملف المدارس" : "ملف الحراس"}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Success banner */}
      {saved && (
        <div className="bg-green-50 border border-green-300 rounded-2xl px-6 py-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800 text-sm">تم حفظ البيانات بنجاح</p>
            <p className="text-green-700 text-xs mt-0.5">
              تم حفظ البيانات المستوردة وربطها بالنظام بنجاح — يمكنك الآن الاطلاع عليها من إدارة الحراس وإدارة المدارس
            </p>
          </div>
        </div>
      )}

      {/* Pending preview + save/cancel */}
      {pending && (
        <div className="bg-white rounded-2xl border-2 border-primary/30 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-2"
            style={{ background: "hsl(174 65% 96%)" }}>
            {pending.summary.failedRecords === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            )}
            <h3 className="font-bold text-base text-foreground flex-1">معاينة البيانات المستوردة</h3>
            <span className="text-xs text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full">
              في انتظار الحفظ
            </span>
          </div>

          {/* Stats grid */}
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "حراس مستوردون", value: pending.summary.guardsImported, color: "text-teal-700 bg-teal-50 border-teal-200" },
                { label: "مدارس مستوردة", value: pending.summary.schoolsImported, color: "text-blue-700 bg-blue-50 border-blue-200" },
                { label: "سجلات مرتبطة", value: pending.summary.linkedRecords, color: "text-green-700 bg-green-50 border-green-200" },
                { label: "تحذيرات", value: pending.summary.failedRecords, color: pending.summary.failedRecords > 0 ? "text-orange-700 bg-orange-50 border-orange-200" : "text-gray-500 bg-gray-50 border-gray-200" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-4 border ${item.color} text-center`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs mt-1 opacity-80">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {pending.summary.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-orange-800 font-semibold text-sm mb-2">التفاصيل والتحذيرات:</p>
                <ul className="space-y-1">
                  {pending.summary.errors.slice(0, 20).map((err, i) => (
                    <li key={i} className="text-orange-700 text-xs">• {err}</li>
                  ))}
                  {pending.summary.errors.length > 20 && (
                    <li className="text-orange-500 text-xs">... و {pending.summary.errors.length - 20} تحذيرات أخرى</li>
                  )}
                </ul>
              </div>
            )}

            {/* Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>البيانات معروضة للمعاينة فقط — يجب النقر على <strong>حفظ البيانات المستوردة</strong> لحفظها بشكل نهائي في النظام.</span>
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex gap-3">
              <button
                onClick={commitPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                حفظ البيانات المستوردة
              </button>
              <button
                onClick={cancelPending}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-5 py-3 rounded-2xl text-sm font-semibold transition-colors"
              >
                <Ban className="w-4 h-4" />
                إلغاء الاستيراد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear real data */}
      {hasRealData && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-sm">حذف البيانات المستوردة</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                يوجد {realGuardsCount} حارس و {realSchoolsCount} مدرسة مستوردة من Excel
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("هل أنت متأكد من حذف البيانات المستوردة؟ لا يمكن التراجع عن هذا الإجراء.")) {
                  clearData();
                  setPending(null);
                }
              }}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              حذف البيانات المستوردة
            </button>
          </div>
        </div>
      )}

      {/* Current data summary */}
      {hasData && (
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="font-semibold text-foreground text-sm mb-3">ملخص البيانات الحالية</p>
          <div className="grid grid-cols-2 gap-3">
            {hasDemoData && (
              <>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{demoGuardsCount}</p>
                  <p className="text-xs text-amber-600 mt-0.5">حارس تجريبي</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{demoSchoolsCount}</p>
                  <p className="text-xs text-amber-600 mt-0.5">مدرسة تجريبية</p>
                </div>
              </>
            )}
            {hasRealData && (
              <>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-teal-700">{realGuardsCount}</p>
                  <p className="text-xs text-teal-600 mt-0.5">حارس مستورد</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-teal-700">{realSchoolsCount}</p>
                  <p className="text-xs text-teal-600 mt-0.5">مدرسة مستوردة</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

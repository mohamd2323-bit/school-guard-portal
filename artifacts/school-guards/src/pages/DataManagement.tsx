import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useStore } from "../store/useStore";
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
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).trim();
}

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = normalizeStr(row[k]);
    if (v) return v;
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
    const name = pick(row,
      "اسم المدرسة", "المدرسة", "School Name", "school_name", "name", "الاسم",
      "اسم المدرسه", "school", "School",
    );
    if (!name) {
      errors.push(`مدرسة - الصف ${i + 2}: اسم المدرسة مفقود`);
      return;
    }
    const typeRaw = pick(row, "النوع", "نوع المدرسة", "Type", "type", "جنس المدرسة");
    let type: School["type"] = "بنين";
    if (typeRaw.includes("بنات") || typeRaw.toLowerCase().includes("girl")) type = "بنات";
    else if (typeRaw.includes("مختلط") || typeRaw.toLowerCase().includes("mix")) type = "مختلط";

    schools.push({
      id: generateId(),
      name,
      governorate: pick(row,
        "المحافظة", "محافظة", "Governorate", "governorate",
        "المنطقة الفرعية", "District",
      ),
      level: pick(row,
        "المرحلة", "المرحلة الدراسية", "Level", "level",
        "مرحلة", "Stage",
      ),
      type,
      principalName: pick(row,
        "اسم المدير", "اسم المديرة", "اسم المدير/ة", "اسم مدير المدرسة",
        "Principal Name", "principal_name", "المدير", "المديرة",
      ),
      principalNationalId: pick(row,
        "سجل المدير", "سجل المديرة", "سجل المدير/ة", "رقم هوية المدير",
        "رقم هوية المديرة", "هوية المدير", "Principal ID", "principal_id",
        "رقم الهوية",
      ),
      principalPhone: pick(row,
        "جوال المدير", "جوال المديرة", "جوال المدير/ة", "رقم جوال المدير",
        "هاتف المدير", "Principal Phone", "principal_phone", "الجوال",
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
    const name = pick(row,
      "اسم الحارس", "الاسم", "اسم الحارسة", "اسم الموظف", "الاسم الكامل",
      "Guard Name", "name", "Full Name",
    );
    if (!name) {
      errors.push(`حارس - الصف ${i + 2}: اسم الحارس مفقود`);
      return;
    }

    const principalIdInRow = pick(row,
      "سجل المدير", "سجل المديرة", "سجل المدير/ة", "رقم هوية المدير",
      "هوية المدير", "Principal ID", "principal_id",
    );
    const principalNameInRow = pick(row,
      "اسم المدير", "اسم المديرة", "اسم المدير/ة", "المدير", "المديرة",
      "Principal Name", "principal_name",
    );
    const schoolNameInRow = pick(row,
      "اسم المدرسة", "المدرسة", "School Name", "school_name", "school",
    );

    let linkedSchool: School | undefined;
    if (principalIdInRow) linkedSchool = linkedSchools.find((s) => s.principalNationalId === principalIdInRow);
    if (!linkedSchool && principalNameInRow) linkedSchool = linkedSchools.find((s) => s.principalName === principalNameInRow);
    if (!linkedSchool && schoolNameInRow) linkedSchool = linkedSchools.find((s) => s.name === schoolNameInRow);
    if (linkedSchool) linkedCount++;

    const genderRaw = pick(row, "الجنس", "جنس الحارس", "Gender", "gender");
    const gender: Guard["gender"] =
      genderRaw.includes("أنثى") || genderRaw.toLowerCase().includes("female") || genderRaw === "ف"
        ? "أنثى"
        : "ذكر";

    const statusRaw = pick(row, "الحالة", "حالة الحارس", "Status", "status");
    const status: Guard["status"] =
      statusRaw.includes("غير") || statusRaw.toLowerCase().includes("inactive")
        ? "غير نشط"
        : "نشط";

    guards.push({
      id: generateId(),
      name,
      nationalId: pick(row,
        "السجل المدني", "رقم الهوية", "رقم السجل المدني", "هوية الحارس",
        "National ID", "national_id", "الهوية",
      ),
      phone: pick(row,
        "رقم الجوال", "الجوال", "جوال الحارس", "رقم الهاتف",
        "Phone", "phone", "هاتف",
      ),
      gender,
      status,
      jobType: pick(row,
        "نوع الوظيفة", "نوع الوظيفه", "Job Type", "job_type", "نوع العقد",
      ) || undefined,
      jobTitle: pick(row,
        "المسمى الوظيفي", "المسمى", "المسمى الوظيفى", "Job Title", "job_title",
        "الوظيفة", "مسمى وظيفي",
      ) || undefined,
      rank: pick(row,
        "المرتبة", "الدرجة", "المرتبة/الدرجة", "الدرجة الوظيفية",
        "Rank", "rank", "Grade",
      ) || undefined,
      appointmentCategory: pick(row,
        "فئة التعيين", "Appointment Category", "appointment_category", "فئة",
      ) || undefined,
      region: pick(row,
        "المنطقة", "Region", "region",
      ) || undefined,
      governorate: pick(row,
        "المحافظة", "محافظة", "Governorate", "governorate",
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

export default function DataManagement() {
  const { importData, clearData, clearDemoData, loadDemoData, hasData, hasDemoData, hasRealData, guards, schools } = useStore();

  const [mode, setMode] = useState<"single" | "dual">("single");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const singleRef = useRef<HTMLInputElement>(null);

  // Dual-mode state
  const [schoolsFile, setSchoolsFile] = useState<File | null>(null);
  const [guardsFile, setGuardsFile] = useState<File | null>(null);

  const demoGuardsCount = guards.filter((g) => g.isDemo).length;
  const demoSchoolsCount = schools.filter((s) => s.isDemo).length;
  const realGuardsCount = guards.filter((g) => !g.isDemo).length;
  const realSchoolsCount = schools.filter((s) => !s.isDemo).length;

  // ── Single-file import ───────────────────────────────────────────────────

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

  async function processSingleFile(file: File) {
    setImporting(true);
    setSummary(null);
    try {
      const wb = await readWorkbook(file);
      const { schools: importedSchools, guards: importedGuards, linkedCount, errors } = processWorkbook(wb);
      importData(importedGuards, importedSchools);
      setSummary({
        guardsImported: importedGuards.length,
        schoolsImported: importedSchools.length,
        linkedRecords: linkedCount,
        failedRecords: errors.length,
        errors,
      });
    } catch (err) {
      setSummary({ guardsImported: 0, schoolsImported: 0, linkedRecords: 0, failedRecords: 1, errors: ["حدث خطأ أثناء قراءة الملف: " + String(err)] });
    }
    setImporting(false);
  }

  // ── Dual-file import ─────────────────────────────────────────────────────

  async function processDualFiles() {
    if (!schoolsFile && !guardsFile) return;
    setImporting(true);
    setSummary(null);
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

      importData(importedGuards, importedSchools);
      setSummary({
        guardsImported: importedGuards.length,
        schoolsImported: importedSchools.length,
        linkedRecords: linkedCount,
        failedRecords: allErrors.length,
        errors: allErrors,
      });
      setSchoolsFile(null);
      setGuardsFile(null);
    } catch (err) {
      setSummary({ guardsImported: 0, schoolsImported: 0, linkedRecords: 0, failedRecords: 1, errors: ["حدث خطأ: " + String(err)] });
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
          onClick={() => { setMode("single"); setSummary(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${mode === "single" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          <File className="w-4 h-4" />
          ملف واحد (ورقتان)
        </button>
        <button
          onClick={() => { setMode("dual"); setSummary(null); }}
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

      {/* Import Summary */}
      {summary && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            {summary.failedRecords === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            )}
            <h3 className="font-bold text-base text-foreground">ملخص الاستيراد</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: "حراس مستوردون", value: summary.guardsImported, color: "text-teal-700 bg-teal-50" },
                { label: "مدارس مستوردة", value: summary.schoolsImported, color: "text-blue-700 bg-blue-50" },
                { label: "سجلات مرتبطة", value: summary.linkedRecords, color: "text-green-700 bg-green-50" },
                { label: "تحذيرات", value: summary.failedRecords, color: summary.failedRecords > 0 ? "text-orange-700 bg-orange-50" : "text-gray-500 bg-gray-50" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-4 ${item.color} text-center`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs mt-1 opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
            {summary.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-orange-800 font-semibold text-sm mb-2">التفاصيل والتحذيرات:</p>
                <ul className="space-y-1">
                  {summary.errors.slice(0, 20).map((err, i) => (
                    <li key={i} className="text-orange-700 text-xs">• {err}</li>
                  ))}
                  {summary.errors.length > 20 && (
                    <li className="text-orange-500 text-xs">... و {summary.errors.length - 20} تحذيرات أخرى</li>
                  )}
                </ul>
              </div>
            )}
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
                  setSummary(null);
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

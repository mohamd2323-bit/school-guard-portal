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
} from "lucide-react";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).trim();
}

export default function DataManagement() {
  const { importData, clearData, hasData, guards, schools } = useStore();
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    if (!file) return;
    setImporting(true);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        const errors: string[] = [];

        // --- SCHOOLS sheet ---
        const schoolSheetName = workbook.SheetNames.find((n) =>
          n.trim().toLowerCase().includes("school") ||
          n.trim().includes("مدارس") ||
          n.trim().includes("المدارس")
        );

        const importedSchools: School[] = [];

        if (schoolSheetName) {
          const ws = workbook.Sheets[schoolSheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: "",
          });

          rows.forEach((row, i) => {
            const name = normalizeStr(
              row["اسم المدرسة"] ?? row["School Name"] ?? row["school_name"] ?? row["name"]
            );
            if (!name) {
              errors.push(`مدرسة - الصف ${i + 2}: اسم المدرسة مفقود`);
              return;
            }
            const school: School = {
              id: generateId(),
              name,
              governorate: normalizeStr(
                row["المحافظة"] ?? row["Governorate"] ?? row["governorate"] ?? ""
              ),
              level: normalizeStr(
                row["المرحلة"] ?? row["Level"] ?? row["level"] ?? ""
              ),
              type: (normalizeStr(
                row["النوع"] ?? row["Type"] ?? row["type"] ?? "بنين"
              ) as School["type"]) || "بنين",
              principalName: normalizeStr(
                row["اسم المدير"] ?? row["اسم المديرة"] ?? row["اسم المدير/ة"] ??
                row["Principal Name"] ?? row["principal_name"] ?? ""
              ),
              principalNationalId: normalizeStr(
                row["سجل المدير"] ?? row["سجل المديرة"] ?? row["سجل المدير/ة"] ??
                row["Principal ID"] ?? row["principal_id"] ?? ""
              ),
              principalPhone: normalizeStr(
                row["جوال المدير"] ?? row["جوال المديرة"] ?? row["جوال المدير/ة"] ??
                row["Principal Phone"] ?? row["principal_phone"] ?? ""
              ),
            };
            importedSchools.push(school);
          });
        } else {
          errors.push("لم يتم العثور على ورقة المدارس (Schools)");
        }

        // --- GUARDS sheet ---
        const guardSheetName = workbook.SheetNames.find((n) =>
          n.trim().toLowerCase().includes("guard") ||
          n.trim().includes("حراس") ||
          n.trim().includes("الحراس")
        );

        const importedGuards: Guard[] = [];
        let linkedCount = 0;

        if (guardSheetName) {
          const ws = workbook.Sheets[guardSheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: "",
          });

          rows.forEach((row, i) => {
            const name = normalizeStr(
              row["اسم الحارس"] ?? row["الاسم"] ?? row["Guard Name"] ?? row["name"]
            );
            if (!name) {
              errors.push(`حارس - الصف ${i + 2}: اسم الحارس مفقود`);
              return;
            }

            const principalIdInRow = normalizeStr(
              row["سجل المدير"] ?? row["سجل المديرة"] ?? row["سجل المدير/ة"] ??
              row["Principal ID"] ?? row["principal_id"] ?? ""
            );
            const principalNameInRow = normalizeStr(
              row["اسم المدير"] ?? row["اسم المديرة"] ?? row["اسم المدير/ة"] ??
              row["Principal Name"] ?? row["principal_name"] ?? ""
            );
            const schoolNameInRow = normalizeStr(
              row["اسم المدرسة"] ?? row["School Name"] ?? row["school_name"] ?? ""
            );

            // Link: first try principal national ID, then principal name, then school name
            let linkedSchool: School | undefined;

            if (principalIdInRow) {
              linkedSchool = importedSchools.find(
                (s) => s.principalNationalId === principalIdInRow
              );
            }
            if (!linkedSchool && principalNameInRow) {
              linkedSchool = importedSchools.find(
                (s) => s.principalName === principalNameInRow
              );
            }
            if (!linkedSchool && schoolNameInRow) {
              linkedSchool = importedSchools.find(
                (s) => s.name === schoolNameInRow
              );
            }

            if (linkedSchool) linkedCount++;

            const genderRaw = normalizeStr(
              row["الجنس"] ?? row["Gender"] ?? row["gender"] ?? "ذكر"
            );
            const gender: Guard["gender"] =
              genderRaw.includes("أنثى") || genderRaw.toLowerCase().includes("female")
                ? "أنثى"
                : "ذكر";

            const statusRaw = normalizeStr(
              row["الحالة"] ?? row["Status"] ?? row["status"] ?? "نشط"
            );
            const status: Guard["status"] =
              statusRaw.includes("غير") || statusRaw.toLowerCase().includes("inactive")
                ? "غير نشط"
                : "نشط";

            const guard: Guard = {
              id: generateId(),
              name,
              nationalId: normalizeStr(
                row["السجل المدني"] ?? row["National ID"] ?? row["national_id"] ?? ""
              ),
              phone: normalizeStr(
                row["رقم الجوال"] ?? row["الجوال"] ?? row["Phone"] ?? row["phone"] ?? ""
              ),
              gender,
              status,
              schoolId: linkedSchool?.id ?? null,
              schoolName: linkedSchool?.name ?? null,
            };
            importedGuards.push(guard);
          });
        } else {
          errors.push("لم يتم العثور على ورقة الحراس (Guards)");
        }

        importData(importedGuards, importedSchools);

        setSummary({
          guardsImported: importedGuards.length,
          schoolsImported: importedSchools.length,
          linkedRecords: linkedCount,
          failedRecords: errors.length,
          errors,
        });
      } catch (err) {
        setSummary({
          guardsImported: 0,
          schoolsImported: 0,
          linkedRecords: 0,
          failedRecords: 1,
          errors: ["حدث خطأ أثناء قراءة الملف: " + String(err)],
        });
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">إدارة البيانات</h2>
        <p className="text-muted-foreground text-sm mt-1">
          استيراد بيانات الحراس والمدارس من ملف Excel
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">تعليمات الاستيراد</p>
            <ul className="text-muted-foreground space-y-1.5 list-disc list-inside marker:text-primary">
              <li>يجب أن يحتوي الملف على ورقتين: <strong>Schools</strong> (المدارس) و <strong>Guards</strong> (الحراس)</li>
              <li>يتم قراءة ورقة المدارس أولاً ثم ورقة الحراس</li>
              <li>يتم ربط الحراس بالمدارس أولاً عبر سجل المدير، وإن لم يُوجد فعبر اسم المدير</li>
              <li>يتم حفظ البيانات محلياً بشكل دائم في المتصفح</li>
              <li>الاستيراد الجديد يستبدل البيانات القديمة بالكامل</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />
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
                <p className="text-muted-foreground text-sm mt-1">أو انقر للاختيار من الجهاز</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-1 rounded">.xlsx</span>
                <span className="bg-muted px-2 py-1 rounded">.xls</span>
              </div>
              <button
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              >
                <Upload className="w-4 h-4" />
                اختر ملف Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
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
                { label: "سجلات فاشلة", value: summary.failedRecords, color: "text-red-700 bg-red-50" },
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

      {/* Clear data */}
      {hasData && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-sm">حذف جميع البيانات</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                يوجد حالياً {guards.length} حارس و {schools.length} مدرسة
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.")) {
                  clearData();
                  setSummary(null);
                }
              }}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              حذف البيانات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

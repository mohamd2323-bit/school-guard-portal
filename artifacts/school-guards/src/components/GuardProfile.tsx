import {
  X, User, School, UserCheck, History, AlertTriangle,
  ArrowLeftRight, UserPlus, Briefcase, Wallet, Pencil, Settings2, Trash2,
} from "lucide-react";
import type { Guard, School as SchoolType, Operation, OperationType } from "../types";
import { useStore } from "../store/useStore";

interface Props {
  guard: Guard;
  school: SchoolType | null;
  onClose: () => void;
}

function InfoRow({ label, value, fallback = "—" }: {
  label: string;
  value: string | null | undefined;
  fallback?: string;
}) {
  const display = value && value.trim() !== "" ? value.trim() : fallback;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground text-sm w-40 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium ${display === fallback ? "text-muted-foreground" : "text-foreground"}`}>
        {display}
      </span>
    </div>
  );
}

const OP_ICONS: Record<OperationType, React.ReactNode> = {
  "نقل حارس": <ArrowLeftRight className="w-3.5 h-3.5" />,
  "إضافة حارس": <UserPlus className="w-3.5 h-3.5" />,
  "تكليف حارس": <Briefcase className="w-3.5 h-3.5" />,
  "بدل حارس": <Wallet className="w-3.5 h-3.5" />,
  "تعديل بيانات": <Pencil className="w-3.5 h-3.5" />,
  "إلغاء تكليف": <X className="w-3.5 h-3.5" />,
  "إنهاء نقل": <ArrowLeftRight className="w-3.5 h-3.5" />,
  "إنهاء تكليف": <X className="w-3.5 h-3.5" />,
  "حذف مدرسة": <Trash2 className="w-3.5 h-3.5" />,
  "حذف حارس": <Trash2 className="w-3.5 h-3.5" />,
  "أخرى": <Settings2 className="w-3.5 h-3.5" />,
};

const OP_COLORS: Record<OperationType, string> = {
  "نقل حارس": "bg-indigo-50 text-indigo-700",
  "إضافة حارس": "bg-green-50 text-green-700",
  "تكليف حارس": "bg-amber-50 text-amber-700",
  "بدل حارس": "bg-teal-50 text-teal-700",
  "تعديل بيانات": "bg-purple-50 text-purple-700",
  "إلغاء تكليف": "bg-rose-50 text-rose-700",
  "إنهاء نقل": "bg-orange-50 text-orange-700",
  "إنهاء تكليف": "bg-red-50 text-red-700",
  "حذف مدرسة": "bg-red-50 text-red-700",
  "حذف حارس": "bg-red-50 text-red-700",
  "أخرى": "bg-gray-50 text-gray-600",
};

const VIOLATION_STATUS_COLORS: Record<string, string> = {
  "جديد": "bg-blue-100 text-blue-800",
  "تحت الإجراء": "bg-amber-100 text-amber-800",
  "مغلق": "bg-gray-100 text-gray-600",
};

const VIOLATION_TYPE_COLORS: Record<string, string> = {
  "شكوى": "bg-red-50 text-red-700",
  "ملاحظة": "bg-blue-50 text-blue-700",
  "بلاغ": "bg-amber-50 text-amber-700",
  "مخالفة": "bg-rose-50 text-rose-800",
  "أخرى": "bg-gray-50 text-gray-600",
};

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}

function opSummary(op: Operation): string {
  const d = op.details;
  switch (op.type) {
    case "نقل حارس": return `من ${d.fromSchoolName || "—"} إلى ${d.toSchoolName || "—"}`;
    case "إضافة حارس": return `تمت الإضافة في ${d.schoolName || "—"}`;
    case "تكليف حارس": return `تكليف في ${d.entity || "—"} (${d.startDate || ""}–${d.endDate || ""})`;
    case "بدل حارس": return `حالة البدل: ${d.allowanceStatus || "—"}`;
    case "تعديل بيانات": return d.summary || "تعديل البيانات الأساسية";
    default: return "";
  }
}

export default function GuardProfile({ guard, school, onClose }: Props) {
  const { operations, violations } = useStore();

  const guardOps = operations
    .filter((op) => op.guardId === guard.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const guardViolations = violations
    .filter((v) => v.guardId === guard.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeAssignment = guardOps.find(
    (op) => op.type === "تكليف حارس" && op.assignmentStatus === "نشط"
  ) ?? null;

  const displaySchoolName = guard.schoolName?.trim() || "لا يوجد";
  const displayGovernorate = guard.governorate?.trim() || school?.governorate || "غير محدد";
  const displayRegion = guard.region?.trim() || "عسير";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{guard.name}</h2>
              <p className="text-white/70 text-xs">{guard.jobTitle || guard.jobType || "ملف الحارس"}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Guard data */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">بيانات الحارس</h3>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="اسم الحارس" value={guard.name} />
              <InfoRow label="السجل المدني" value={guard.nationalId} />
              <InfoRow label="الجنس" value={guard.gender} />
              <InfoRow label="رقم الجوال" value={guard.phone} />
              <InfoRow label="المسمى الوظيفي" value={guard.jobTitle || guard.jobType} fallback="غير محدد" />
              <InfoRow label="المرتبة/الدرجة" value={guard.rank} fallback="غير محدد" />
              <InfoRow label="فئة التعيين" value={guard.appointmentCategory} fallback="غير محدد" />
              <InfoRow label="الحالة" value={guard.status} />
              <InfoRow label="المدرسة" value={displaySchoolName} />
              <InfoRow label="المنطقة" value={displayRegion} />
              <InfoRow label="المحافظة" value={displayGovernorate} />
            </div>
          </section>

          {/* Active assignment */}
          {activeAssignment && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-foreground">التكليف الحالي</h3>
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">نشط</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground text-sm w-40 flex-shrink-0">الجهة المكلَّف إليها</span>
                  <span className="text-sm font-semibold text-amber-800">{activeAssignment.details.entity || "—"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground text-sm w-40 flex-shrink-0">تاريخ بدء التكليف</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(activeAssignment.details.startDate || activeAssignment.date)}</span>
                </div>
              </div>
            </section>
          )}

          {/* School data */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <School className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">بيانات المدرسة</h3>
            </div>
            {school ? (
              <div className="bg-muted/40 rounded-xl px-4 py-1">
                <InfoRow label="اسم المدرسة" value={school.name} />
                <InfoRow label="المحافظة" value={school.governorate} />
                <InfoRow label="المرحلة" value={school.level} />
                <InfoRow label="النوع" value={school.type} />
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl px-4 py-3 text-center text-muted-foreground text-sm">لا توجد مدرسة مرتبطة</div>
            )}
          </section>

          {/* Principal data */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">بيانات المدير/ة</h3>
            </div>
            {school ? (
              <div className="bg-muted/40 rounded-xl px-4 py-1">
                <InfoRow label="اسم المدير/ة" value={school.principalName} />
                <InfoRow label="سجل المدير/ة" value={school.principalNationalId} />
                <InfoRow label="جوال المدير/ة" value={school.principalPhone} />
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl px-4 py-3 text-center text-muted-foreground text-sm">لا توجد بيانات مدير</div>
            )}
          </section>

          {/* Violations */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-foreground">المخالفات والشكاوى</h3>
              {guardViolations.length > 0 && (
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{guardViolations.length}</span>
              )}
            </div>
            {guardViolations.length === 0 ? (
              <div className="bg-muted/40 rounded-xl px-4 py-4 text-center text-muted-foreground text-sm">لا توجد مخالفات مسجلة</div>
            ) : (
              <div className="space-y-2">
                {guardViolations.map((v) => (
                  <div key={v.id} className="bg-muted/40 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${VIOLATION_TYPE_COLORS[v.type] || "bg-gray-50 text-gray-600"}`}>
                          {v.type}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{v.caseNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${VIOLATION_STATUS_COLORS[v.status] || ""}`}>{v.status}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(v.reportDate)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mt-1.5 line-clamp-2">{v.description}</p>
                    {v.actionTaken && (
                      <p className="text-xs text-muted-foreground mt-1">الإجراء: {v.actionTaken}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Operations history */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">سجل العمليات</h3>
              {guardOps.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{guardOps.length}</span>
              )}
            </div>
            {guardOps.length === 0 ? (
              <div className="bg-muted/40 rounded-xl px-4 py-4 text-center text-muted-foreground text-sm">لا توجد عمليات مسجلة</div>
            ) : (
              <div className="space-y-2">
                {guardOps.map((op) => (
                  <div key={op.id} className="bg-muted/40 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${OP_COLORS[op.type]}`}>
                        {OP_ICONS[op.type]}
                        {op.type}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(op.date)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1.5">{opSummary(op)}</p>
                    {op.notes && <p className="text-xs text-muted-foreground mt-1">ملاحظة: {op.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import { X, User, School, UserCheck } from "lucide-react";
import type { Guard, School as SchoolType } from "../types";

interface Props {
  guard: Guard;
  school: SchoolType | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground text-sm w-36 flex-shrink-0">{label}</span>
      <span className="text-foreground text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function GuardProfile({ guard, school, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ background: "hsl(174 65% 28%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{guard.name}</h2>
              <p className="text-white/70 text-xs">ملف الحارس</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
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
              <InfoRow label="الاسم" value={guard.name} />
              <InfoRow label="السجل المدني" value={guard.nationalId} />
              <InfoRow label="رقم الجوال" value={guard.phone} />
              <InfoRow label="الجنس" value={guard.gender} />
              <InfoRow label="الحالة" value={guard.status} />
            </div>
          </section>

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
              <div className="bg-muted/40 rounded-xl px-4 py-3 text-center text-muted-foreground text-sm">
                لا توجد مدرسة مرتبطة
              </div>
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
              <div className="bg-muted/40 rounded-xl px-4 py-3 text-center text-muted-foreground text-sm">
                لا توجد بيانات مدير
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

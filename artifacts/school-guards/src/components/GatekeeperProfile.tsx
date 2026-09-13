import { Building2, Calendar, Check, Copy, FileText, School, UserCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Gatekeeper, Operation, School as SchoolType } from "../types";
import { displayGovernorate } from "../lib/governorates";

interface Props {
  gatekeeper: Gatekeeper;
  school: SchoolType | null;
  operations: Operation[];
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && value.trim() ? value.trim() : "-";
  return (
    <div className="flex items-start gap-2 border-b border-border py-2.5 last:border-0">
      <span className="w-40 flex-shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${display === "-" ? "text-muted-foreground" : "text-foreground"}`}>
        {display}
      </span>
    </div>
  );
}

export default function GatekeeperProfile({ gatekeeper, school, operations, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const history = useMemo(
    () =>
      operations
        .filter((op) => op.details?.gatekeeperId === gatekeeper.id)
        .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()),
    [gatekeeper.id, operations]
  );

  function handleCopy() {
    const lines = [
      "ملف البواب",
      `اسم البواب: ${gatekeeper.name}`,
      `رقم الهوية/السجل المدني: ${gatekeeper.nationalId}`,
      `رقم الجوال: ${gatekeeper.phone || "-"}`,
      `الجنس: ${gatekeeper.gender}`,
      `الشركة المشغلة: ${gatekeeper.company}`,
      `الحالة: ${gatekeeper.status}`,
      `تاريخ المباشرة: ${gatekeeper.startDate || "-"}`,
      `المدرسة: ${school?.name ?? "-"}`,
      `المحافظة: ${school ? displayGovernorate(school.governorate) : "-"}`,
      `المرحلة: ${school?.level ?? "-"}`,
      `نوع المدرسة: ${school?.type ?? "-"}`,
      `اسم المدير/ة: ${school?.principalName ?? "-"}`,
      `سجل المدير/ة: ${school?.principalNationalId ?? "-"}`,
      `جوال المدير/ة: ${school?.principalPhone ?? "-"}`,
      `ملاحظات: ${gatekeeper.notes || "-"}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between rounded-t-2xl px-6 py-4" style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{gatekeeper.name}</h2>
              <p className="text-xs text-white/70">{gatekeeper.company || "الشركة المشغلة غير محددة"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">بيانات البواب</h3>
            </div>
            <div className="rounded-xl bg-muted/40 px-4 py-1">
              <InfoRow label="اسم البواب" value={gatekeeper.name} />
              <InfoRow label="رقم الهوية/السجل المدني" value={gatekeeper.nationalId} />
              <InfoRow label="رقم الجوال" value={gatekeeper.phone} />
              <InfoRow label="الجنس" value={gatekeeper.gender} />
              <InfoRow label="الشركة المشغلة" value={gatekeeper.company} />
              <InfoRow label="الحالة" value={gatekeeper.status} />
              <InfoRow label="تاريخ المباشرة" value={gatekeeper.startDate} />
              <InfoRow label="ملاحظات" value={gatekeeper.notes} />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">المدرسة المرتبط بها</h3>
            </div>
            {school ? (
              <div className="rounded-xl bg-muted/40 px-4 py-1">
                <InfoRow label="اسم المدرسة" value={school.name} />
                <InfoRow label="المحافظة" value={displayGovernorate(school.governorate)} />
                <InfoRow label="المرحلة" value={school.level} />
                <InfoRow label="نوع المدرسة" value={school.type} />
                <InfoRow label="اسم المدير/ة" value={school.principalName} />
                <InfoRow label="سجل المدير/ة" value={school.principalNationalId} />
                <InfoRow label="جوال المدير/ة" value={school.principalPhone} />
              </div>
            ) : (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center text-sm font-medium text-muted-foreground">
                المدرسة المرتبطة غير موجودة في قاعدة البيانات الحالية
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">سجل العمليات والتنقلات</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {history.length} عملية
              </span>
            </div>
            {history.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-4 py-6 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">لا توجد عمليات مسجلة لهذا البواب</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((op) => (
                  <div key={op.id} className="rounded-xl border border-border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{op.type}</p>
                      <span className="text-xs text-muted-foreground">{op.date}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{op.notes || op.details?.summary || "-"}</p>
                    {(op.details?.fromSchoolName || op.details?.toSchoolName) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        من: {op.details.fromSchoolName || "-"} إلى: {op.details.toSchoolName || "-"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 rounded-b-2xl border-t border-border bg-white px-6 py-4">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              copied ? "border-green-300 bg-green-50 text-green-700" : "border-border bg-white text-foreground hover:bg-muted/60"
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "تم النسخ" : "نسخ البيانات"}
          </button>
          <button onClick={onClose} className="mr-auto rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

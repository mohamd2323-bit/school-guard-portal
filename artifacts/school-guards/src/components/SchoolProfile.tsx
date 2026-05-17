import { X, School, UserCheck, ShieldCheck, Printer, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { School as SchoolType, Guard } from "../types";

interface Props {
  school: SchoolType;
  guards: Guard[];
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && value.trim() ? value.trim() : "—";
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-border last:border-0">
      <span className="text-muted-foreground text-sm w-40 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium ${display === "—" ? "text-muted-foreground" : "text-foreground"}`}>
        {display}
      </span>
    </div>
  );
}

export default function SchoolProfile({ school, guards, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const linkedGuards = guards.filter((g) => g.schoolId === school.id);

  function handleCopy() {
    const lines: string[] = [
      "══════════════════════════════",
      "       ملف المدرسة",
      "══════════════════════════════",
      "",
      "── بيانات المدرسة ──",
      `اسم المدرسة: ${school.name}`,
      `المحافظة: ${school.governorate}`,
      `المرحلة: ${school.level}`,
      `النوع: ${school.type}`,
      `اسم المدير/ة: ${school.principalName}`,
      `سجل المدير/ة: ${school.principalNationalId}`,
      `جوال المدير/ة: ${school.principalPhone}`,
      "",
      `── الحراس على ملاك المدرسة (${linkedGuards.length}) ──`,
    ];

    if (linkedGuards.length === 0) {
      lines.push("لا يوجد حراس مرتبطون بهذه المدرسة");
    } else {
      linkedGuards.forEach((g, i) => {
        lines.push(`${i + 1}. ${g.name}`);
        lines.push(`   السجل المدني: ${g.nationalId}`);
        lines.push(`   الجوال: ${g.phone || "—"}`);
        lines.push(`   المسمى الوظيفي: ${g.jobTitle || g.jobType || "—"}`);
        lines.push(`   الحالة: ${g.status}`);
        if (i < linkedGuards.length - 1) lines.push("");
      });
    }

    lines.push("");
    lines.push("══════════════════════════════");
    lines.push(`تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    const guardRows =
      linkedGuards.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px;">لا يوجد حراس مرتبطون بهذه المدرسة</td></tr>`
        : linkedGuards
            .map(
              (g) => `
              <tr>
                <td>${g.name}</td>
                <td>${g.nationalId}</td>
                <td>${g.phone || "—"}</td>
                <td>${g.jobTitle || g.jobType || "—"}</td>
                <td>${g.status}</td>
              </tr>`
            )
            .join("");

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>ملف المدرسة - ${school.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; direction: rtl; }
          .header { text-align: center; border-bottom: 3px solid #1a7a6e; padding-bottom: 16px; margin-bottom: 24px; }
          .header .ministry { font-size: 11px; color: #555; margin-bottom: 4px; }
          .header h1 { font-size: 20px; font-weight: bold; color: #1a7a6e; margin-bottom: 2px; }
          .header .sub { font-size: 12px; color: #777; }
          .section-title { font-size: 14px; font-weight: bold; color: #1a7a6e; border-right: 4px solid #1a7a6e; padding-right: 10px; margin: 20px 0 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
          .info-row { display: flex; gap: 8px; }
          .info-label { color: #666; width: 130px; flex-shrink: 0; font-size: 12px; }
          .info-value { font-weight: 600; font-size: 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
          .badge-male { background: #dbeafe; color: #1e40af; }
          .badge-female { background: #fce7f3; color: #9d174d; }
          .guard-count { display: inline-block; background: #1a7a6e; color: white; padding: 2px 10px; border-radius: 99px; font-size: 12px; margin-right: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #1a7a6e; color: white; padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: right; }
          td { padding: 7px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
          tr:nth-child(even) td { background: #f9fafb; }
          .status-active { color: #166534; font-weight: 600; }
          .status-inactive { color: #991b1b; font-weight: 600; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="ministry">وزارة التعليم — إدارة الأمن والسلامة — الأمن المدرسي — تعليم عسير</div>
          <h1>ملف المدرسة</h1>
          <div class="sub">${school.name}</div>
        </div>

        <div class="section-title">بيانات المدرسة</div>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">اسم المدرسة</span><span class="info-value">${school.name}</span></div>
          <div class="info-row"><span class="info-label">المحافظة</span><span class="info-value">${school.governorate}</span></div>
          <div class="info-row"><span class="info-label">المرحلة</span><span class="info-value">${school.level}</span></div>
          <div class="info-row">
            <span class="info-label">النوع</span>
            <span class="info-value">
              <span class="badge ${school.type === "بنين" ? "badge-male" : school.type === "بنات" ? "badge-female" : ""}">${school.type}</span>
            </span>
          </div>
          <div class="info-row"><span class="info-label">اسم المدير/ة</span><span class="info-value">${school.principalName}</span></div>
          <div class="info-row"><span class="info-label">سجل المدير/ة</span><span class="info-value">${school.principalNationalId}</span></div>
          <div class="info-row"><span class="info-label">جوال المدير/ة</span><span class="info-value">${school.principalPhone}</span></div>
        </div>

        <div class="section-title">
          الحراس على ملاك المدرسة
          <span class="guard-count">${linkedGuards.length} حارس</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم الحارس</th>
              <th>السجل المدني</th>
              <th>رقم الجوال</th>
              <th>المسمى الوظيفي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${guardRows}</tbody>
        </table>

        <div class="footer">
          <span>نظام إدارة الحراسات المدرسية — تعليم عسير</span>
          <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ background: "hsl(174 65% 28%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{school.name}</h2>
              <p className="text-white/70 text-xs">
                {school.governorate} — {school.level} —{" "}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold
                  ${school.type === "بنين" ? "bg-blue-200/30 text-blue-100" : school.type === "بنات" ? "bg-pink-200/30 text-pink-100" : "bg-white/20 text-white"}`}
                >
                  {school.type}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* School info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <School className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">بيانات المدرسة</h3>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="اسم المدرسة" value={school.name} />
              <InfoRow label="المحافظة" value={school.governorate} />
              <InfoRow label="المرحلة" value={school.level} />
              <InfoRow
                label="النوع بنين/بنات"
                value={school.type}
              />
            </div>
          </section>

          {/* Principal info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">بيانات المدير/ة</h3>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="اسم المدير/ة" value={school.principalName} />
              <InfoRow label="سجل المدير/ة" value={school.principalNationalId} />
              <InfoRow label="جوال المدير/ة" value={school.principalPhone} />
            </div>
          </section>

          {/* Guards */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">الحراس على ملاك المدرسة</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold
                  ${linkedGuards.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {linkedGuards.length} حارس
              </span>
            </div>

            {linkedGuards.length === 0 ? (
              <div className="bg-muted/40 rounded-xl px-4 py-6 text-center">
                <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">
                  لا يوجد حراس مرتبطون بهذه المدرسة
                </p>
              </div>
            ) : (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم الحارس</th>
                        <th>السجل المدني</th>
                        <th>رقم الجوال</th>
                        <th>المسمى الوظيفي</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedGuards.map((g, i) => (
                        <tr key={g.id}>
                          <td className="text-muted-foreground text-xs w-8">{i + 1}</td>
                          <td className="font-medium text-foreground">{g.name}</td>
                          <td className="font-mono text-sm">{g.nationalId}</td>
                          <td className="font-mono text-sm" dir="ltr">{g.phone || "—"}</td>
                          <td className="text-sm">{g.jobTitle || g.jobType || "—"}</td>
                          <td>
                            <span
                              className={`badge ${
                                g.status === "نشط"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {g.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-white rounded-b-2xl">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة ملف المدرسة
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors
              ${copied
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-border text-foreground hover:bg-muted/60"}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "تم النسخ!" : "نسخ البيانات"}
          </button>
          <button
            onClick={onClose}
            className="mr-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

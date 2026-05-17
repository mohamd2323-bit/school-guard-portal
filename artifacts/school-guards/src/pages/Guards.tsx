import { useState } from "react";
import { useStore } from "../store/useStore";
import GuardProfile from "../components/GuardProfile";
import type { Guard } from "../types";
import { Search, FileText, Users } from "lucide-react";

export default function Guards() {
  const { guards, schools } = useStore();
  const [search, setSearch] = useState("");
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);

  const filtered = guards.filter(
    (g) =>
      g.name.includes(search) ||
      g.nationalId.includes(search) ||
      g.phone.includes(search) ||
      (g.schoolName || "").includes(search)
  );

  const selectedSchool = selectedGuard
    ? schools.find((s) => s.id === selectedGuard.schoolId) || null
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة الحراس</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            إجمالي: {guards.length.toLocaleString("ar-SA")} حارس
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {guards.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">لا توجد بيانات حالياً</p>
            <p className="text-muted-foreground text-sm mt-1">
              يرجى استيراد بيانات من{" "}
              <a href="/data" className="text-primary hover:underline">
                إدارة البيانات
              </a>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            لا توجد نتائج مطابقة للبحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-20">ملف</th>
                  <th>اسم الحارس</th>
                  <th>السجل المدني</th>
                  <th>رقم الجوال</th>
                  <th>المدرسة الحالية</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guard) => (
                  <tr key={guard.id}>
                    <td>
                      <button
                        onClick={() => setSelectedGuard(guard)}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium text-xs bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="عرض الملف"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>ملف</span>
                      </button>
                    </td>
                    <td className="font-medium">{guard.name}</td>
                    <td className="font-mono text-sm">{guard.nationalId}</td>
                    <td dir="ltr" className="text-right font-mono text-sm">
                      {guard.phone}
                    </td>
                    <td>{guard.schoolName || <span className="text-muted-foreground text-xs">غير محدد</span>}</td>
                    <td>
                      <span className={`badge ${guard.status === "نشط" ? "badge-active" : "badge-inactive"}`}>
                        {guard.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedGuard && (
        <GuardProfile
          guard={selectedGuard}
          school={selectedSchool}
          onClose={() => setSelectedGuard(null)}
        />
      )}
    </div>
  );
}

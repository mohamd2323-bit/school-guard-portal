import { useState } from "react";
import { useStore } from "../store/useStore";
import { Search, School as SchoolIcon } from "lucide-react";

export default function Schools() {
  const { schools } = useStore();
  const [search, setSearch] = useState("");

  const filtered = schools.filter(
    (s) =>
      s.name.includes(search) ||
      s.governorate.includes(search) ||
      s.level.includes(search) ||
      s.principalName.includes(search) ||
      s.principalNationalId.includes(search)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة المدارس</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            إجمالي: {schools.length.toLocaleString("ar-SA")} مدرسة
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
        {schools.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <SchoolIcon className="w-7 h-7 text-muted-foreground" />
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
                  <th>اسم المدرسة</th>
                  <th>المحافظة</th>
                  <th>المرحلة</th>
                  <th>النوع بنين/بنات</th>
                  <th>اسم المدير/ة</th>
                  <th>سجل المدير/ة</th>
                  <th>جوال المدير/ة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school) => (
                  <tr key={school.id}>
                    <td className="font-medium">{school.name}</td>
                    <td>{school.governorate}</td>
                    <td>{school.level}</td>
                    <td>
                      <span
                        className={`badge ${school.type === "بنين" ? "badge-male" : school.type === "بنات" ? "badge-female" : "bg-purple-100 text-purple-800"}`}
                      >
                        {school.type}
                      </span>
                    </td>
                    <td>{school.principalName}</td>
                    <td className="font-mono text-sm">{school.principalNationalId}</td>
                    <td dir="ltr" className="text-right font-mono text-sm">
                      {school.principalPhone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

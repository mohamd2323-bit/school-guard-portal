import { useStore } from "../store/useStore";
import { Users, School, UserCheck, UserX, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { guards, schools } = useStore();

  const totalGuards = guards.length;
  const totalSchools = schools.length;
  const maleGuards = guards.filter((g) => g.gender === "ذكر").length;
  const femaleGuards = guards.filter((g) => g.gender === "أنثى").length;
  const schoolsWithoutGuard = schools.filter(
    (s) => !guards.some((g) => g.schoolId === s.id)
  ).length;

  const stats = [
    {
      label: "إجمالي الحراس",
      value: totalGuards,
      icon: Users,
      color: "bg-teal-50 text-teal-600",
      border: "border-teal-200",
    },
    {
      label: "إجمالي المدارس",
      value: totalSchools,
      icon: School,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-200",
    },
    {
      label: "الحراس الذكور",
      value: maleGuards,
      icon: UserCheck,
      color: "bg-indigo-50 text-indigo-600",
      border: "border-indigo-200",
    },
    {
      label: "الحارسات الإناث",
      value: femaleGuards,
      icon: UserX,
      color: "bg-pink-50 text-pink-600",
      border: "border-pink-200",
    },
    {
      label: "مدارس بدون حارس",
      value: schoolsWithoutGuard,
      icon: AlertTriangle,
      color: "bg-orange-50 text-orange-600",
      border: "border-orange-200",
    },
  ];

  const isEmpty = totalGuards === 0 && totalSchools === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">لوحة التحكم</h2>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على بيانات الحراسات المدرسية</p>
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-base">لا توجد بيانات حالياً</p>
          <p className="text-muted-foreground text-sm mt-1">
            يرجى الانتقال إلى{" "}
            <a href="/data" className="text-primary hover:underline font-medium">
              إدارة البيانات
            </a>{" "}
            لاستيراد ملف Excel
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`stat-card border ${stat.border}`}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-0.5">{stat.value.toLocaleString("ar-SA")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

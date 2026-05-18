import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Users, School, UserCheck, UserX, AlertTriangle,
  ShieldCheck, Briefcase, Wallet, ChevronDown, BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
  PieChart, Pie, Legend,
} from "recharts";
import { useStore } from "../store/useStore";
import type { Guard } from "../types";

// ─── Colour palette ───────────────────────────────────────────────────────────

const TEAL_SHADES = [
  "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4",
  "#99f6e4", "#1a7a6e", "#116960", "#0a5047", "#04302b",
];

const PIE_COLORS = {
  gender: { "ذكر": "#0f766e", "أنثى": "#ec4899" },
  status: { "نشط": "#0d9488", "غير نشط": "#94a3b8" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function count<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  arr.forEach((item) => {
    const k = key(item) || "غير محدد";
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function jobLabel(g: Guard) {
  return g.jobTitle?.trim() || g.jobType?.trim() || "غير محدد";
}

function govLabel(g: Guard) {
  return g.governorate?.trim() || "غير محدد";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, bg, iconColor, border, onClick,
}: {
  label: string; value: number;
  icon: React.ElementType;
  bg: string; iconColor: string; border: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      className={`bg-white rounded-2xl border ${border} p-5 flex items-center gap-4 shadow-sm w-full text-right${onClick ? " hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer active:scale-100" : ""}`}
      {...(onClick ? { onClick } : {})}
    >
      <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <div>
        <p className="text-muted-foreground text-sm leading-none">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
          {value.toLocaleString("ar-SA")}
        </p>
      </div>
    </Wrapper>
  );
}

function ChartCard({ title, children, empty }: {
  title: string; children: React.ReactNode; empty?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 overflow-hidden">
      <h3 className="text-sm font-bold text-foreground mb-4 border-r-4 border-primary pr-3">{title}</h3>
      {empty ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">لا توجد بيانات حالياً</p>
        </div>
      ) : (
        <div className="overflow-hidden">{children}</div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-primary font-bold mt-0.5">{payload[0].value.toLocaleString("ar-SA")}</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { fill: string } }[] }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-foreground">{payload[0].name}</p>
        <p className="font-bold mt-0.5" style={{ color: payload[0].payload.fill }}>{payload[0].value.toLocaleString("ar-SA")}</p>
      </div>
    );
  }
  return null;
};

function SelectFilter({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-border rounded-xl pr-3 pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Bar chart (horizontal) ───────────────────────────────────────────────────

function HBarChart({ data, color = "#0f766e", maxBars = 12 }: {
  data: { name: string; value: number }[];
  color?: string;
  maxBars?: number;
}) {
  const sliced = data.slice(0, maxBars);
  const barH = 32;
  const height = Math.max(sliced.length * barH + 20, 80);

  return (
    <div style={{ height }} className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sliced} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: "#333", fontFamily: "Cairo, sans-serif" }}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0faf9" }} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={22}>
            {sliced.map((_, i) => (
              <Cell key={i} fill={TEAL_SHADES[i % TEAL_SHADES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function DonutChart({ data, colorMap }: {
  data: { name: string; value: number }[];
  colorMap?: Record<string, string>;
}) {
  const colored = data.map((d, i) => ({
    ...d,
    fill: colorMap?.[d.name] ?? TEAL_SHADES[i % TEAL_SHADES.length],
  }));

  return (
    <div className="w-full overflow-hidden" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={colored}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            nameKey="name"
            paddingAngle={3}
          >
            {colored.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend
            iconType="circle"
            iconSize={9}
            formatter={(value) => (
              <span style={{ fontSize: 12, color: "#333", fontFamily: "Cairo, sans-serif" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { guards, schools, operations } = useStore();
  const [, navigate] = useLocation();

  const [filterGov, setFilterGov] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJob, setFilterJob] = useState("");

  const isEmpty = guards.length === 0 && schools.length === 0;

  // Unique filter options
  const govOptions = useMemo(() =>
    [...new Set([
      ...guards.map((g) => g.governorate?.trim()).filter(Boolean),
      ...schools.map((s) => s.governorate?.trim()).filter(Boolean),
    ])].sort() as string[],
    [guards, schools]
  );

  const jobOptions = useMemo(() =>
    [...new Set(guards.map(jobLabel).filter((j) => j !== "غير محدد"))].sort(),
    [guards]
  );

  // Filtered guards
  const filteredGuards = useMemo(() =>
    guards.filter((g) =>
      (!filterGov || g.governorate?.trim() === filterGov) &&
      (!filterGender || g.gender === filterGender) &&
      (!filterStatus || g.status === filterStatus) &&
      (!filterJob || jobLabel(g) === filterJob)
    ),
    [guards, filterGov, filterGender, filterStatus, filterJob]
  );

  // Filtered schools (governorate filter only)
  const filteredSchools = useMemo(() =>
    filterGov ? schools.filter((s) => s.governorate?.trim() === filterGov) : schools,
    [schools, filterGov]
  );

  // Stat computations
  const stats = useMemo(() => {
    const assignedSchoolIds = new Set(filteredGuards.map((g) => g.schoolId).filter(Boolean));
    const schoolsNoGuard = filteredSchools.filter((s) => !assignedSchoolIds.has(s.id)).length;

    const assignedToOperation = (type: string) =>
      new Set(
        operations.filter((op) => op.type === type && op.guardId)
          .map((op) => op.guardId!)
          .filter((id) => filteredGuards.some((g) => g.id === id))
      ).size;

    // Active assignments: "تكليف حارس" where assignmentStatus is "نشط"
    // OR has no assignmentStatus at all (legacy records before the field was added)
    const activeAssignmentGuardIds = new Set(
      operations
        .filter(
          (op) =>
            op.type === "تكليف حارس" &&
            op.guardId &&
            (op.assignmentStatus === "نشط" || op.assignmentStatus === undefined) &&
            filteredGuards.some((g) => g.id === op.guardId)
        )
        .map((op) => op.guardId!)
    );

    return {
      total: filteredGuards.length,
      schools: filteredSchools.length,
      male: filteredGuards.filter((g) => g.gender === "ذكر").length,
      female: filteredGuards.filter((g) => g.gender === "أنثى").length,
      schoolsNoGuard,
      active: filteredGuards.filter((g) => g.status === "نشط").length,
      delegated: activeAssignmentGuardIds.size,
      allowance: assignedToOperation("بدل حارس"),
    };
  }, [filteredGuards, filteredSchools, operations]);

  // Chart data
  const chartData = useMemo(() => {
    const guardsByGov = count(filteredGuards, govLabel);
    const guardsByGender = count(filteredGuards, (g) => g.gender);
    const guardsByStatus = count(filteredGuards, (g) => g.status);
    const guardsByJob = count(filteredGuards, jobLabel);

    const schoolsByGov = count(filteredSchools, (s) => s.governorate?.trim() || "غير محدد");

    const assignedSchoolIds = new Set(filteredGuards.map((g) => g.schoolId).filter(Boolean));
    const noGuardByGov = count(
      filteredSchools.filter((s) => !assignedSchoolIds.has(s.id)),
      (s) => s.governorate?.trim() || "غير محدد"
    );

    return { guardsByGov, guardsByGender, guardsByStatus, guardsByJob, schoolsByGov, noGuardByGov };
  }, [filteredGuards, filteredSchools]);

  const hasFilters = filterGov || filterGender || filterStatus || filterJob;

  const statCards: {
    label: string; value: number; icon: React.ElementType;
    bg: string; iconColor: string; border: string; onClick?: () => void;
  }[] = [
    { label: "إجمالي الحراس", value: stats.total, icon: Users, bg: "bg-teal-50", iconColor: "text-teal-600", border: "border-teal-200" },
    { label: "إجمالي المدارس", value: stats.schools, icon: School, bg: "bg-blue-50", iconColor: "text-blue-600", border: "border-blue-200" },
    { label: "الحراس الذكور", value: stats.male, icon: UserCheck, bg: "bg-indigo-50", iconColor: "text-indigo-600", border: "border-indigo-200" },
    { label: "الحارسات الإناث", value: stats.female, icon: UserX, bg: "bg-pink-50", iconColor: "text-pink-600", border: "border-pink-200" },
    { label: "مدارس بدون حارس", value: stats.schoolsNoGuard, icon: AlertTriangle, bg: "bg-orange-50", iconColor: "text-orange-600", border: "border-orange-200" },
    { label: "الحراس على رأس العمل", value: stats.active, icon: ShieldCheck, bg: "bg-emerald-50", iconColor: "text-emerald-600", border: "border-emerald-200" },
    {
      label: "الحراس المكلفون", value: stats.delegated, icon: Briefcase,
      bg: "bg-amber-50", iconColor: "text-amber-600", border: "border-amber-200",
      onClick: () => navigate("/guards?assignment=مكلف"),
    },
    { label: "الحراس الذين يتقاضون بدل", value: stats.allowance, icon: Wallet, bg: "bg-purple-50", iconColor: "text-purple-600", border: "border-purple-200" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Page title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="text-muted-foreground text-sm mt-0.5">نظرة إحصائية شاملة على بيانات الحراسات المدرسية</p>
        </div>
        {!isEmpty && hasFilters && (
          <button
            onClick={() => { setFilterGov(""); setFilterGender(""); setFilterStatus(""); setFilterJob(""); }}
            className="text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors font-medium"
          >
            إزالة الفلاتر
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-base">لا توجد بيانات حالياً</p>
          <p className="text-muted-foreground text-sm mt-1">
            يرجى الانتقال إلى{" "}
            <a href="/data" className="text-primary hover:underline font-medium">إدارة البيانات</a>
            {" "}لاستيراد ملف Excel
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-foreground">تصفية:</span>
            <SelectFilter
              label="كل المحافظات"
              value={filterGov}
              options={govOptions}
              onChange={setFilterGov}
            />
            <SelectFilter
              label="كل الأجناس"
              value={filterGender}
              options={["ذكر", "أنثى"]}
              onChange={setFilterGender}
            />
            <SelectFilter
              label="كل الحالات"
              value={filterStatus}
              options={["نشط", "غير نشط"]}
              onChange={setFilterStatus}
            />
            <SelectFilter
              label="كل المسميات"
              value={filterJob}
              options={jobOptions}
              onChange={setFilterJob}
            />
            {hasFilters && (
              <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-semibold">
                {filteredGuards.length.toLocaleString("ar-SA")} حارس مطابق
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Guards by governorate — wide */}
            <div className="lg:col-span-2">
              <ChartCard
                title="توزيع الحراس حسب المحافظة"
                empty={chartData.guardsByGov.length === 0}
              >
                <HBarChart data={chartData.guardsByGov} />
              </ChartCard>
            </div>

            {/* Gender pie */}
            <ChartCard title="توزيع الحراس حسب الجنس" empty={chartData.guardsByGender.length === 0}>
              <DonutChart data={chartData.guardsByGender} colorMap={PIE_COLORS.gender} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status pie */}
            <ChartCard title="توزيع الحراس حسب الحالة" empty={chartData.guardsByStatus.length === 0}>
              <DonutChart data={chartData.guardsByStatus} colorMap={PIE_COLORS.status} />
            </ChartCard>

            {/* Job title bar — wide */}
            <div className="lg:col-span-2">
              <ChartCard
                title="توزيع الحراس حسب المسمى الوظيفي"
                empty={chartData.guardsByJob.length === 0}
              >
                <HBarChart data={chartData.guardsByJob} />
              </ChartCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Schools by governorate */}
            <ChartCard
              title="توزيع المدارس حسب المحافظة"
              empty={chartData.schoolsByGov.length === 0}
            >
              <HBarChart data={chartData.schoolsByGov} color="#0f766e" />
            </ChartCard>

            {/* Schools with no guard by governorate */}
            <ChartCard
              title="المدارس بدون حارس حسب المحافظة"
              empty={chartData.noGuardByGov.length === 0}
            >
              {chartData.noGuardByGov.length > 0 ? (
                <HBarChart data={chartData.noGuardByGov} color="#f97316" />
              ) : (
                <div className="h-40 flex flex-col items-center justify-center gap-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-60" />
                  <p className="text-muted-foreground text-sm">جميع المدارس لديها حراس</p>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

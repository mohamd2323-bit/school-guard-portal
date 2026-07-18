import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Users, School, UserCheck, UserX, AlertTriangle,
  ShieldCheck, Briefcase, Wallet, ChevronDown,
  Percent, Building2, Activity, Gauge, Venus, Mars,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import type { Guard } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jobLabel(g: Guard) {
  return g.jobTitle?.trim() || g.jobType?.trim() || "غير محدد";
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toLocaleString("ar-SA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatAverage(numerator: number, denominator: number) {
  if (denominator <= 0) return "—";
  return (numerator / denominator).toLocaleString("ar-SA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatFraction(numerator: number, denominator: number) {
  if (denominator <= 0) return "—";
  return `${numerator.toLocaleString("ar-SA")} / ${denominator.toLocaleString("ar-SA")}`;
}

function needLevel(value: number) {
  if (value <= 50) return { label: "منخفض", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (value <= 200) return { label: "متوسط", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
  return { label: "مرتفع", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
}

function getWelcomeMessage(now: Date) {
  const hour = now.getHours();

  if (hour >= 0 && hour < 5) {
    return {
      greeting: "صباح الخير",
      icon: "🌙",
      note: "نتمنى لك عملًا منظمًا ويومًا موفقًا",
    };
  }

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "صباح الخير",
      icon: "☀️",
      note: "نتمنى لك عملًا منظمًا ويومًا موفقًا",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      greeting: "مساء الخير",
      icon: "🌤️",
      note: "نتمنى لك عملًا منظمًا ويومًا موفقًا",
    };
  }

  return {
    greeting: "مساء الخير",
    icon: "🌙",
    note: "نتمنى لك عملًا منظمًا ويومًا موفقًا",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, description, badge, icon: Icon, bg, iconColor, border, onClick,
}: {
  label: string; value: number | string;
  description?: string;
  badge?: { label: string; color: string; bg: string; border: string };
  icon: React.ElementType;
  bg: string; iconColor: string; border: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  const displayValue = typeof value === "number" ? value.toLocaleString("ar-SA") : value;
  return (
    <Wrapper
      className={`bg-white rounded-2xl border ${border} p-5 flex items-center gap-4 shadow-sm w-full min-h-[98px] text-right${onClick ? " hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer active:scale-100" : ""}`}
      {...(onClick ? { onClick } : {})}
    >
      <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm leading-none">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
          {displayValue}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">{description}</p>
        )}
        {badge && (
          <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.label}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { guards, schools, operations, needs } = useStore();
  const { currentUser } = useUsers();
  const [, navigate] = useLocation();

  const [filterGov, setFilterGov] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const welcome = useMemo(() => getWelcomeMessage(now), [now]);
  const displayName = currentUser?.name?.trim() || currentUser?.username || "مستخدم النظام";

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

  const filteredNeeds = useMemo(() =>
    filterGov ? needs.filter((n) => n.governorate?.trim() === filterGov) : needs,
    [needs, filterGov]
  );

  // Stat computations
  const stats = useMemo(() => {
    const assignedSchoolIds = new Set(filteredGuards.map((g) => g.schoolId).filter(Boolean));
    const linkedSchools = filteredSchools.filter((s) => assignedSchoolIds.has(s.id)).length;
    const schoolsNoGuard = filteredSchools.filter((s) => !assignedSchoolIds.has(s.id)).length;
    const openNeeds = filteredNeeds.filter((n) => n.status === "جديد" || n.status === "تحت الإجراء").length;

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
      linkedSchools,
      male: filteredGuards.filter((g) => g.gender === "ذكر").length,
      female: filteredGuards.filter((g) => g.gender === "أنثى").length,
      schoolsNoGuard,
      active: filteredGuards.filter((g) => g.status === "نشط").length,
      delegated: activeAssignmentGuardIds.size,
      allowance: assignedToOperation("بدل حارس"),
      openNeeds,
      needIndex: schoolsNoGuard + openNeeds,
    };
  }, [filteredGuards, filteredSchools, filteredNeeds, operations]);

  const hasFilters = filterGov || filterGender || filterStatus || filterJob;

  const statCards: {
    label: string; value: number; icon: React.ElementType;
    bg: string; iconColor: string; border: string; onClick?: () => void;
  }[] = [
    {
      label: "إجمالي الحراس", value: stats.total, icon: Users,
      bg: "bg-teal-50", iconColor: "text-teal-600", border: "border-teal-200",
      onClick: () => navigate("/guards"),
    },
    {
      label: "إجمالي المدارس", value: stats.schools, icon: School,
      bg: "bg-blue-50", iconColor: "text-blue-600", border: "border-blue-200",
      onClick: () => navigate("/schools"),
    },
    {
      label: "الحراس الذكور", value: stats.male, icon: UserCheck,
      bg: "bg-indigo-50", iconColor: "text-indigo-600", border: "border-indigo-200",
      onClick: () => navigate("/guards?gender=ذكر"),
    },
    {
      label: "الحارسات الإناث", value: stats.female, icon: UserX,
      bg: "bg-pink-50", iconColor: "text-pink-600", border: "border-pink-200",
      onClick: () => navigate("/guards?gender=أنثى"),
    },
    {
      label: "مدارس بدون حارس", value: stats.schoolsNoGuard, icon: AlertTriangle,
      bg: "bg-orange-50", iconColor: "text-orange-600", border: "border-orange-200",
      onClick: () => navigate("/schools?guard=no-guard"),
    },
    {
      label: "الحراس على رأس العمل", value: stats.active, icon: ShieldCheck,
      bg: "bg-emerald-50", iconColor: "text-emerald-600", border: "border-emerald-200",
      onClick: () => navigate("/guards?status=نشط"),
    },
    {
      label: "الحراس المكلفون", value: stats.delegated, icon: Briefcase,
      bg: "bg-amber-50", iconColor: "text-amber-600", border: "border-amber-200",
      onClick: () => navigate("/guards?assignment=مكلف"),
    },
    { label: "الحراس الذين يتقاضون بدل", value: stats.allowance, icon: Wallet, bg: "bg-purple-50", iconColor: "text-purple-600", border: "border-purple-200" },
  ];

  const hasNeedIndex = stats.schools > 0 || stats.openNeeds > 0;
  const needStatus = needLevel(stats.needIndex);
  const insightCards: {
    label: string; value: number | string; description?: string;
    badge?: { label: string; color: string; bg: string; border: string };
    icon: React.ElementType; bg: string; iconColor: string; border: string;
  }[] = [
    {
      label: "نسبة تغطية المدارس",
      value: formatPercent(stats.linkedSchools, stats.schools),
      description: formatFraction(stats.linkedSchools, stats.schools),
      icon: Percent,
      bg: "bg-teal-50",
      iconColor: "text-teal-600",
      border: "border-teal-200",
    },
    {
      label: "نسبة المدارس بدون حارس",
      value: formatPercent(stats.schoolsNoGuard, stats.schools),
      description: formatFraction(stats.schoolsNoGuard, stats.schools),
      icon: Building2,
      bg: "bg-orange-50",
      iconColor: "text-orange-600",
      border: "border-orange-200",
    },
    {
      label: "نسبة الحراس على رأس العمل",
      value: formatPercent(stats.active, stats.total),
      description: formatFraction(stats.active, stats.total),
      icon: Activity,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-200",
    },
    {
      label: "نسبة الحراس المكلفين",
      value: formatPercent(stats.delegated, stats.total),
      description: formatFraction(stats.delegated, stats.total),
      icon: Briefcase,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-200",
    },
    {
      label: "متوسط عدد الحراس لكل مدرسة",
      value: formatAverage(stats.total, stats.schools),
      description: formatFraction(stats.total, stats.schools),
      icon: Gauge,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      border: "border-blue-200",
    },
    {
      label: "نسبة الحراس الذكور",
      value: formatPercent(stats.male, stats.total),
      description: formatFraction(stats.male, stats.total),
      icon: Mars,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      border: "border-indigo-200",
    },
    {
      label: "نسبة الحارسات الإناث",
      value: formatPercent(stats.female, stats.total),
      description: formatFraction(stats.female, stats.total),
      icon: Venus,
      bg: "bg-pink-50",
      iconColor: "text-pink-600",
      border: "border-pink-200",
    },
    {
      label: "مؤشر الاحتياج",
      value: hasNeedIndex ? stats.needIndex : "—",
      description: `${stats.schoolsNoGuard.toLocaleString("ar-SA")} بدون حارس + ${stats.openNeeds.toLocaleString("ar-SA")} طلب مفتوح`,
      badge: hasNeedIndex ? needStatus : undefined,
      icon: AlertTriangle,
      bg: needStatus.bg,
      iconColor: needStatus.color,
      border: needStatus.border,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-xl border border-primary/20 bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {welcome.greeting}، {displayName} <span aria-hidden="true">{welcome.icon}</span>
            </p>
            <p className="mt-2 inline-flex rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-white">
              {welcome.note}
            </p>
          </div>
        </div>
      </section>

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
            <Users className="w-8 h-8 text-muted-foreground" />
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

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insightCards.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

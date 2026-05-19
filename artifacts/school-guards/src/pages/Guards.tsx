import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { useStore } from "../store/useStore";
import GuardProfile from "../components/GuardProfile";
import type { Guard } from "../types";
import { Search, FileText, Users, SlidersHorizontal, X, Briefcase, Download } from "lucide-react";
import * as XLSX from "xlsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unique(values: (string | undefined | null)[]): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, "ar")
  );
}

interface FilterState {
  governorate: string;
  schoolName: string;
  gender: string;
  jobTitle: string;
  rank: string;
  jobType: string;
  status: string;
  assignment: string;
}

const EMPTY_FILTERS: FilterState = {
  governorate: "",
  schoolName: "",
  gender: "",
  jobTitle: "",
  rank: "",
  jobType: "",
  status: "",
  assignment: "",
};

function hasActiveFilters(f: FilterState) {
  return Object.values(f).some((v) => v !== "");
}

// ─── Single select dropdown ───────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
  optionCounts,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  optionCounts?: Record<string, number>;
}) {
  const active = value !== "";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white transition-colors
            ${active ? "border-primary text-primary font-semibold" : "border-border text-foreground"}`}
        >
          <option value="">الكل</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {optionCounts !== undefined ? `${o} (${(optionCounts[o] ?? 0).toLocaleString("ar-SA")})` : o}
            </option>
          ))}
        </select>
        {active && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {!active && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Guards() {
  const { guards, schools, operations } = useStore();
  const searchString = useSearch();

  const assignedGuardIds = useMemo(() => {
    const ids = new Set<string>();
    operations.forEach((op) => {
      if (
        op.type === "تكليف حارس" &&
        op.guardId &&
        (op.assignmentStatus === "نشط" || op.assignmentStatus === undefined)
      ) {
        ids.add(op.guardId);
      }
    });
    return ids;
  }, [operations]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const assignment = params.get("assignment");
    if (assignment === "مكلف" || assignment === "غير مكلف") {
      setFilters((prev) => ({ ...prev, assignment }));
      setFiltersOpen(true);
    }
  }, [searchString]);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);

  // Derive unique option lists from real data
  const options = useMemo(() => ({
    governorate: unique(guards.map((g) => g.governorate)),
    schoolName: unique(guards.map((g) => g.schoolName)),
    gender: unique(guards.map((g) => g.gender)),
    jobTitle: unique(guards.map((g) => g.jobTitle)),
    rank: unique(guards.map((g) => g.rank)),
    jobType: unique(guards.map((g) => g.jobType)),
    status: unique(guards.map((g) => g.status)),
  }), [guards]);

  const setFilter = (key: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  const filtered = useMemo(() => {
    return guards.filter((g) => {
      // Search box
      const q = search.trim();
      const matchSearch =
        !q ||
        g.name.includes(q) ||
        g.nationalId.includes(q) ||
        g.phone.includes(q) ||
        (g.schoolName || "").includes(q) ||
        (g.jobType || "").includes(q) ||
        (g.rank || "").includes(q);

      // Dropdown filters
      const matchGovernorate = !filters.governorate || g.governorate === filters.governorate;
      const matchSchool = !filters.schoolName || g.schoolName === filters.schoolName;
      const matchGender = !filters.gender || g.gender === filters.gender;
      const matchJobTitle = !filters.jobTitle || g.jobTitle === filters.jobTitle;
      const matchRank = !filters.rank || g.rank === filters.rank;
      const matchJobType = !filters.jobType || g.jobType === filters.jobType;
      const matchStatus = !filters.status || g.status === filters.status;
      const isAssigned = assignedGuardIds.has(g.id);
      const matchAssignment =
        !filters.assignment ||
        (filters.assignment === "مكلف" && isAssigned) ||
        (filters.assignment === "غير مكلف" && !isAssigned);

      return (
        matchSearch &&
        matchGovernorate &&
        matchSchool &&
        matchGender &&
        matchJobTitle &&
        matchRank &&
        matchJobType &&
        matchStatus &&
        matchAssignment
      );
    });
  }, [guards, search, filters, assignedGuardIds]);

  // Counts for the assignment filter options, based on all other active filters
  const assignmentCounts = useMemo(() => {
    let assigned = 0;
    let unassigned = 0;
    guards.forEach((g) => {
      const q = search.trim();
      const matchSearch =
        !q ||
        g.name.includes(q) ||
        g.nationalId.includes(q) ||
        g.phone.includes(q) ||
        (g.schoolName || "").includes(q) ||
        (g.jobType || "").includes(q) ||
        (g.rank || "").includes(q);
      const matchGovernorate = !filters.governorate || g.governorate === filters.governorate;
      const matchSchool = !filters.schoolName || g.schoolName === filters.schoolName;
      const matchGender = !filters.gender || g.gender === filters.gender;
      const matchJobTitle = !filters.jobTitle || g.jobTitle === filters.jobTitle;
      const matchRank = !filters.rank || g.rank === filters.rank;
      const matchJobType = !filters.jobType || g.jobType === filters.jobType;
      const matchStatus = !filters.status || g.status === filters.status;
      if (matchSearch && matchGovernorate && matchSchool && matchGender && matchJobTitle && matchRank && matchJobType && matchStatus) {
        if (assignedGuardIds.has(g.id)) assigned++;
        else unassigned++;
      }
    });
    return { "مكلف": assigned, "غير مكلف": unassigned };
  }, [guards, search, filters, assignedGuardIds]);

  const selectedSchool = selectedGuard
    ? schools.find((s) => s.id === selectedGuard.schoolId) || null
    : null;

  function exportToExcel() {
    const rows = filtered.map((g) => ({
      "اسم الحارس": g.name,
      "السجل المدني": g.nationalId,
      "رقم الجوال": g.phone,
      "المدرسة الحالية": g.schoolName ?? "",
      "نوع الوظيفة": g.jobType ?? "",
      "المرتبة": g.rank ?? "",
      "الحالة": g.status,
      "التكليف": assignedGuardIds.has(g.id) ? "مكلف" : "غير مكلف",
    }));

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["اسم الحارس", "السجل المدني", "رقم الجوال", "المدرسة الحالية", "نوع الوظيفة", "المرتبة", "الحالة", "التكليف"],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الحراس");
    XLSX.writeFile(wb, "قائمة_الحراس.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة الحراس</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            إجمالي: {guards.length.toLocaleString("ar-SA")} حارس
            {(search || hasActiveFilters(filters)) && filtered.length !== guards.length && (
              <span className="mr-2 text-primary font-semibold">
                — يُعرض {filtered.length.toLocaleString("ar-SA")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
            />
          </div>
          {/* Toggle filters panel */}
          {guards.length > 0 && (
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors
                ${filtersOpen || activeCount > 0
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-foreground hover:border-primary/40"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              فلاتر
              {activeCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          )}
          {/* Export button */}
          {guards.length > 0 && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              title={`تصدير ${filtered.length.toLocaleString("ar-SA")} حارس إلى Excel`}
            >
              <Download className="w-4 h-4" />
              تصدير
            </button>
          )}
        </div>
      </div>

      {/* ── Filter panel ───────────────────────────────────────────────────── */}
      {guards.length > 0 && filtersOpen && (
        <div className="bg-white border border-border rounded-xl shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <FilterSelect
              label="المحافظة"
              value={filters.governorate}
              options={options.governorate}
              onChange={(v) => setFilter("governorate", v)}
            />
            <FilterSelect
              label="المدرسة"
              value={filters.schoolName}
              options={options.schoolName}
              onChange={(v) => setFilter("schoolName", v)}
            />
            <FilterSelect
              label="الجنس"
              value={filters.gender}
              options={options.gender.length ? options.gender : ["ذكر", "أنثى"]}
              onChange={(v) => setFilter("gender", v)}
            />
            <FilterSelect
              label="المسمى الوظيفي"
              value={filters.jobTitle}
              options={options.jobTitle}
              onChange={(v) => setFilter("jobTitle", v)}
            />
            <FilterSelect
              label="المرتبة"
              value={filters.rank}
              options={options.rank}
              onChange={(v) => setFilter("rank", v)}
            />
            <FilterSelect
              label="نوع الوظيفة"
              value={filters.jobType}
              options={options.jobType}
              onChange={(v) => setFilter("jobType", v)}
            />
            <FilterSelect
              label="الحالة"
              value={filters.status}
              options={options.status.length ? options.status : ["نشط", "غير نشط"]}
              onChange={(v) => setFilter("status", v)}
            />
            <FilterSelect
              label="التكليف"
              value={filters.assignment}
              options={["مكلف", "غير مكلف"]}
              onChange={(v) => setFilter("assignment", v)}
              optionCounts={assignmentCounts}
            />
          </div>

          {/* Clear button */}
          {hasActiveFilters(filters) && (
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {activeCount} {activeCount === 1 ? "فلتر نشط" : "فلاتر نشطة"} — يُعرض{" "}
                <span className="font-semibold text-primary">{filtered.length.toLocaleString("ar-SA")}</span>{" "}
                من أصل {guards.length.toLocaleString("ar-SA")} حارس
              </p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                مسح الفلاتر
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table (unchanged) ──────────────────────────────────────────────── */}
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
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">لا توجد نتائج مطابقة</p>
            {hasActiveFilters(filters) && (
              <button onClick={clearFilters}
                className="mt-2 text-sm text-primary hover:underline font-medium">
                مسح الفلاتر
              </button>
            )}
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
                  <th>نوع الوظيفة</th>
                  <th>المرتبة</th>
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
                    <td className="font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {guard.isDemo && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="بيانات تجريبية" />
                        )}
                        {guard.name}
                        {assignedGuardIds.has(guard.id) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <Briefcase className="w-3 h-3" />
                            مكلف
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-sm">{guard.nationalId}</td>
                    <td dir="ltr" className="text-right font-mono text-sm">
                      {guard.phone}
                    </td>
                    <td>{guard.schoolName || <span className="text-muted-foreground text-xs">غير محدد</span>}</td>
                    <td>
                      {guard.jobType ? (
                        <span className="text-sm text-foreground">{guard.jobType}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {guard.rank ? (
                        <span className="badge bg-teal-50 text-teal-700">{guard.rank}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
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

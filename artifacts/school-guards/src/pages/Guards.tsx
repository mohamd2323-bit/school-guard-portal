import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useStore } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import GuardProfile from "../components/GuardProfile";
import type { Guard, School, Operation } from "../types";
import type { Employee } from "../store/useUsers";
import {
  Search, FileText, Users, SlidersHorizontal, X, Briefcase,
  Download, Pencil, Trash2, Eye, EyeOff, Save, AlertTriangle,
  Check, ChevronsUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function unique(values: (string | undefined | null)[]): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, "ar")
  );
}

interface FilterState {
  governorate: string[];
  schoolName: string;
  gender: string;
  jobTitle: string[];
  rank: string[];
  jobType: string;
  status: string;
  assignment: string;
  noSchool: string;
}

const EMPTY_FILTERS: FilterState = {
  governorate: [],
  schoolName: "",
  gender: "",
  jobTitle: [],
  rank: [],
  jobType: "",
  status: "",
  assignment: "",
  noSchool: "",
};

function isUnassignedSchool(schoolName: string | null | undefined): boolean {
  if (!schoolName) return true;
  const trimmed = schoolName.trim();
  return trimmed === "" || trimmed === "غير محدد";
}

function hasActiveFilters(f: FilterState) {
  return Object.values(f).some((v) => Array.isArray(v) ? v.length > 0 : v !== "");
}

function activeFilterCount(f: FilterState) {
  return Object.values(f).reduce((total, v) => total + (Array.isArray(v) ? v.length : v ? 1 : 0), 0);
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v !== "");
  return typeof value === "string" && value !== "" ? [value] : [];
}

function matchAny(selected: string[], value: string | null | undefined) {
  return selected.length === 0 || selected.includes(value ?? "");
}

// ─── Single select dropdown ───────────────────────────────────────────────────

function selectedSummary(label: string, selectedCount: number) {
  if (selectedCount === 0) return "الكل";
  if (label === "المحافظة") return `${selectedCount.toLocaleString("ar-SA")} محافظات محددة`;
  if (label === "المرتبة") return selectedCount === 2 ? "مرتبتان محددتان" : `${selectedCount.toLocaleString("ar-SA")} مراتب محددة`;
  if (label === "المسمى الوظيفي") return `${selectedCount.toLocaleString("ar-SA")} مسميات محددة`;
  return `${selectedCount.toLocaleString("ar-SA")} قيم محددة`;
}

function MultiFilterSelect({
  label,
  values,
  options,
  onChange,
  searchable = false,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(values);
  const filteredOptions = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((option) => option.includes(q));
  }, [options, query]);
  const active = values.length > 0;

  const toggleValue = (value: string) => {
    onChange(selected.has(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <div className="relative flex min-w-0 flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-card
          ${active ? "border-primary text-primary font-semibold" : "border-border text-foreground"}`}
      >
        <span className="truncate">{selectedSummary(label, values.length)}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-full min-w-[240px] overflow-hidden rounded-xl border border-border bg-white shadow-xl dark:bg-card">
          <div className="border-b border-border p-2">
            {searchable && (
              <div className="relative mb-2">
                <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث..."
                  className="w-full rounded-lg border border-border bg-background py-2 pr-8 pl-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChange(options)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                مسح الكل
              </button>
            </div>
          </div>

          <div className="max-h-[min(18rem,55vh)] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد نتائج</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selected.has(option);
                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(option)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate">{option}</span>
                    {checked && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  values,
  options,
  onChange,
  optionCounts,
  searchable,
}: {
  label: string;
  value?: string;
  values?: string[];
  options: string[];
  onChange: (v: string | string[]) => void;
  optionCounts?: Record<string, number>;
  searchable?: boolean;
}) {
  if (values) {
    return (
      <MultiFilterSelect
        label={label}
        values={values}
        options={options}
        onChange={onChange as (values: string[]) => void}
        searchable={searchable}
      />
    );
  }

  const currentValue = value ?? "";
  const active = currentValue !== "";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={currentValue}
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

// ─── Filter persistence helpers ───────────────────────────────────────────────

const GUARDS_STORAGE_KEY = "guardsFilters";

interface GuardsPersistedState {
  search: string;
  filters: FilterState;
}

const FILTER_URL_KEYS = ["q", "governorate", "schoolName", "gender", "jobTitle", "rank", "jobType", "status", "assignment", "noSchool"];

function initGuardsState(): GuardsPersistedState {
  const p = new URLSearchParams(window.location.search);
  const hasUrlFilters = FILTER_URL_KEYS.some((k) => p.get(k));
  if (hasUrlFilters) {
    const assignment = p.get("assignment") ?? "";
    const gender = p.get("gender") ?? "";
    const status = p.get("status") ?? "";
    return {
      search: p.get("q") ?? "",
      filters: {
        governorate: p.getAll("governorate").filter(Boolean),
        schoolName: p.get("schoolName") ?? "",
        gender: gender === "ذكر" || gender === "أنثى" ? gender : "",
        jobTitle: p.getAll("jobTitle").filter(Boolean),
        rank: p.getAll("rank").filter(Boolean),
        jobType: p.get("jobType") ?? "",
        status: status === "نشط" || status === "غير نشط" ? status : "",
        assignment: assignment === "مكلف" || assignment === "غير مكلف" ? assignment : "",
        noSchool: p.get("noSchool") === "true" ? "true" : "",
      },
    };
  }
  try {
    const raw = sessionStorage.getItem(GUARDS_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as GuardsPersistedState;
      if (stored && typeof stored.filters === "object") {
        return {
          search: stored.search ?? "",
          filters: {
            ...EMPTY_FILTERS,
            ...stored.filters,
            governorate: toArray(stored.filters.governorate),
            jobTitle: toArray(stored.filters.jobTitle),
            rank: toArray(stored.filters.rank),
          },
        };
      }
    }
  } catch {}
  return { search: "", filters: EMPTY_FILTERS };
}

// ─── Edit Guard Modal ──────────────────────────────────────────────────────────

function EditGuardModal({
  guard,
  schools,
  onSave,
  onClose,
}: {
  guard: Guard;
  schools: School[];
  onSave: (patch: Partial<Guard>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: guard.name,
    nationalId: guard.nationalId,
    phone: guard.phone,
    gender: guard.gender as string,
    jobTitle: guard.jobTitle ?? "",
    rank: guard.rank ?? "",
    jobType: guard.jobType ?? "",
    schoolId: guard.schoolId ?? "",
    status: guard.status as string,
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selectedSchool = form.schoolId
      ? schools.find((s) => s.id === form.schoolId)
      : null;
    const patch: Partial<Guard> = {
      name: form.name.trim(),
      nationalId: form.nationalId.trim(),
      phone: form.phone.trim(),
      gender: form.gender as "ذكر" | "أنثى",
      jobTitle: form.jobTitle.trim() || undefined,
      rank: form.rank.trim() || undefined,
      jobType: form.jobType.trim() || undefined,
      schoolId: selectedSchool?.id ?? null,
      schoolName: selectedSchool?.name ?? null,
      status: form.status as "نشط" | "غير نشط",
    };
    onSave(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            تعديل بيانات الحارس
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="edit-guard-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* اسم الحارس */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                اسم الحارس <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* السجل المدني */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                السجل المدني <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nationalId}
                onChange={(e) => set("nationalId", e.target.value)}
                required
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>

            {/* رقم الجوال */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">رقم الجوال</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
            </div>

            {/* الجنس */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">الجنس</label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            {/* الحالة */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
            </div>

            {/* المسمى الوظيفي */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المسمى الوظيفي</label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* المرتبة */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المرتبة</label>
              <input
                type="text"
                value={form.rank}
                onChange={(e) => set("rank", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* نوع الوظيفة */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع الوظيفة</label>
              <input
                type="text"
                value={form.jobType}
                onChange={(e) => set("jobType", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* المدرسة الحالية */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">المدرسة الحالية</label>
              <select
                value={form.schoolId}
                onChange={(e) => set("schoolId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— غير محدد —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted text-foreground transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="edit-guard-form"
            className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-colors bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Guard Dialog ───────────────────────────────────────────────────────

function DeleteGuardDialog({
  guard,
  currentUser,
  onConfirm,
  onClose,
}: {
  guard: Guard;
  currentUser: Employee;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, password }),
      });
      const data = await res.json() as { ok: boolean };
      if (!data.ok) {
        setError("كلمة المرور غير صحيحة");
        return;
      }
      onConfirm();
    } catch {
      setError("تعذر التحقق من كلمة المرور، حاول مجدداً");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="font-bold text-foreground text-lg">تأكيد حذف الحارس</h2>
          <p className="text-muted-foreground text-sm mt-1">هذا الإجراء لا يمكن التراجع عنه</p>
        </div>

        {/* Guard info */}
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">اسم الحارس</span>
            <span className="font-semibold text-foreground">{guard.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">السجل المدني</span>
            <span className="font-mono font-semibold text-foreground" dir="ltr">{guard.nationalId}</span>
          </div>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="أدخل كلمة مرورك للتأكيد"
                dir="ltr"
                autoFocus
                required
                className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-red-300 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!password || verifying}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              {verifying
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Trash2 className="w-4 h-4" />}
              {verifying ? "جارٍ التحقق…" : "حذف"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Guards() {
  const { guards, schools, operations, updateGuard, deleteGuard } = useStore();
  const { isAdmin, currentUser } = useUsers();
  const [, navigate] = useLocation();

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

  const initialState = useMemo(initGuardsState, []);
  const [search, setSearch] = useState(initialState.search);
  const [filters, setFilters] = useState<FilterState>(initialState.filters);
  const [filtersOpen, setFiltersOpen] = useState(
    () => hasActiveFilters(initialState.filters) || initialState.search !== ""
  );
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state: GuardsPersistedState = { search, filters };
    try { sessionStorage.setItem(GUARDS_STORAGE_KEY, JSON.stringify(state)); } catch {}
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    filters.governorate.forEach((value) => p.append("governorate", value));
    if (filters.schoolName) p.set("schoolName", filters.schoolName);
    if (filters.gender) p.set("gender", filters.gender);
    filters.jobTitle.forEach((value) => p.append("jobTitle", value));
    filters.rank.forEach((value) => p.append("rank", value));
    if (filters.jobType) p.set("jobType", filters.jobType);
    if (filters.status) p.set("status", filters.status);
    if (filters.assignment) p.set("assignment", filters.assignment);
    if (filters.noSchool) p.set("noSchool", filters.noSchool);
    const qs = p.toString();
    navigate("/guards" + (qs ? "?" + qs : ""), { replace: true });
  }, [filters, search, navigate]);

  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [filters, search]);

  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [editTarget, setEditTarget] = useState<Guard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guard | null>(null);

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

  const setFilter = (key: keyof FilterState, value: FilterState[typeof key]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeCount = activeFilterCount(filters);

  const filtered = useMemo(() => {
    return guards.filter((g) => {
      const q = search.trim();
      const matchSearch =
        !q ||
        g.name.includes(q) ||
        g.nationalId.includes(q) ||
        g.phone.includes(q) ||
        (g.schoolName || "").includes(q) ||
        (g.jobType || "").includes(q) ||
        (g.rank || "").includes(q);

      const matchGovernorate = matchAny(filters.governorate, g.governorate);
      const matchSchool = !filters.schoolName || g.schoolName === filters.schoolName;
      const matchGender = !filters.gender || g.gender === filters.gender;
      const matchJobTitle = matchAny(filters.jobTitle, g.jobTitle);
      const matchRank = matchAny(filters.rank, g.rank);
      const matchJobType = !filters.jobType || g.jobType === filters.jobType;
      const matchStatus = !filters.status || g.status === filters.status;
      const isAssigned = assignedGuardIds.has(g.id);
      const matchAssignment =
        !filters.assignment ||
        (filters.assignment === "مكلف" && isAssigned) ||
        (filters.assignment === "غير مكلف" && !isAssigned);

      const matchNoSchool =
        !filters.noSchool || isUnassignedSchool(g.schoolName);

      return (
        matchSearch &&
        matchGovernorate &&
        matchSchool &&
        matchGender &&
        matchJobTitle &&
        matchRank &&
        matchJobType &&
        matchStatus &&
        matchAssignment &&
        matchNoSchool
      );
    });
  }, [guards, search, filters, assignedGuardIds]);

  // Count guards with no assigned school (across ALL guards, shown on the quick-filter button)
  const unassignedSchoolCount = useMemo(
    () => guards.filter((g) => isUnassignedSchool(g.schoolName)).length,
    [guards]
  );

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
      const matchGovernorate = matchAny(filters.governorate, g.governorate);
      const matchSchool = !filters.schoolName || g.schoolName === filters.schoolName;
      const matchGender = !filters.gender || g.gender === filters.gender;
      const matchJobTitle = matchAny(filters.jobTitle, g.jobTitle);
      const matchRank = matchAny(filters.rank, g.rank);
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

  // ── Edit / Delete handlers ──────────────────────────────────────────────────

  function handleEditSave(patch: Partial<Guard>) {
    if (!editTarget || !currentUser) return;
    const now = new Date().toISOString();
    const op: Operation = {
      id: genId(),
      type: "تعديل بيانات",
      guardId: editTarget.id,
      guardName: patch.name ?? editTarget.name,
      date: now.split("T")[0],
      notes: "",
      createdAt: now,
      details: {
        nationalId: editTarget.nationalId,
        performedBy: currentUser.username,
      },
      performedBy: currentUser.username,
    };
    updateGuard(editTarget.id, patch, op);
    setEditTarget(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget || !currentUser) return;
    const now = new Date().toISOString();
    const op: Operation = {
      id: genId(),
      type: "حذف حارس",
      guardId: deleteTarget.id,
      guardName: deleteTarget.name,
      date: now.split("T")[0],
      notes: "",
      createdAt: now,
      details: {
        nationalId: deleteTarget.nationalId,
        deletedBy: currentUser.username,
      },
      performedBy: currentUser.username,
    };
    deleteGuard(deleteTarget.id, op);
    setDeleteTarget(null);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-4 overflow-hidden">
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
          {/* Quick filter: no school assigned */}
          {guards.length > 0 && (
            <button
              onClick={() => setFilter("noSchool", filters.noSchool ? "" : "true")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap
                ${filters.noSchool
                  ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  : "border-border bg-white text-foreground hover:border-orange-300 hover:text-orange-600"}`}
              title="عرض الحراس غير المسندين لأي مدرسة"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filters.noSchool ? "bg-orange-500" : "bg-muted-foreground/40"}`} />
              غير مسندين لمدارس
              {unassignedSchoolCount > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  filters.noSchool ? "bg-orange-200 text-orange-800" : "bg-muted text-muted-foreground"
                }`}>
                  {unassignedSchoolCount.toLocaleString("ar-SA")}
                </span>
              )}
            </button>
          )}
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
        <div className="bg-white border border-border rounded-xl shadow-sm p-4 space-y-4 dark:bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <FilterSelect
              label="المحافظة"
              values={filters.governorate}
              options={options.governorate}
              onChange={(v) => setFilter("governorate", v)}
              searchable
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
              values={filters.jobTitle}
              options={options.jobTitle}
              onChange={(v) => setFilter("jobTitle", v as string[])}
              searchable
            />
            <FilterSelect
              label="المرتبة"
              values={filters.rank}
              options={options.rank}
              onChange={(v) => setFilter("rank", v as string[])}
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

          {(filters.governorate.length > 0 || filters.jobTitle.length > 0 || filters.rank.length > 0) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {([
                ["governorate", "المحافظة", filters.governorate],
                ["jobTitle", "المسمى الوظيفي", filters.jobTitle],
                ["rank", "المرتبة", filters.rank],
              ] as const).flatMap(([key, label, values]) =>
                values.map((value) => (
                  <span
                    key={`${key}-${value}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    <span className="text-primary/70">{label}:</span>
                    <span className="truncate">{value}</span>
                    <button
                      type="button"
                      onClick={() => setFilter(key, values.filter((v) => v !== value))}
                      className="rounded-full p-0.5 hover:bg-primary/15"
                      aria-label={`إزالة ${value}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          )}

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

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-card">
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
          <div ref={tableScrollRef} className="h-full overflow-auto">
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-36">إجراءات</th>
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
                      <div className="flex items-center gap-1.5">
                        {/* ملف */}
                        <button
                          onClick={() => setSelectedGuard(guard)}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-xs bg-primary/5 hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors"
                          title="عرض الملف"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ملف</span>
                        </button>
                        {/* تعديل */}
                        <button
                          onClick={() => setEditTarget(guard)}
                          className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium text-xs bg-amber-50 hover:bg-amber-100 px-2 py-1.5 rounded-lg transition-colors"
                          title="تعديل بيانات الحارس"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        {/* حذف — admin only */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(guard)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-lg transition-colors"
                            title="حذف الحارس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
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

      {/* ── Guard Profile Modal ─────────────────────────────────────────────── */}
      {selectedGuard && (
        <GuardProfile
          guard={selectedGuard}
          school={selectedSchool}
          onClose={() => setSelectedGuard(null)}
        />
      )}

      {/* ── Edit Guard Modal ────────────────────────────────────────────────── */}
      {editTarget && (
        <EditGuardModal
          guard={editTarget}
          schools={schools}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Delete Guard Dialog ─────────────────────────────────────────────── */}
      {deleteTarget && currentUser && (
        <DeleteGuardDialog
          guard={deleteTarget}
          currentUser={currentUser}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

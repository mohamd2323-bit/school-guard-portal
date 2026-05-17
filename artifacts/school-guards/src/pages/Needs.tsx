import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import type { Need, NeedStatus, NeedType, School } from "../types";
import {
  Plus,
  Search,
  ClipboardList,
  X,
  ChevronDown,
  Trash2,
  Calendar,
  Building2,
  UserCheck,
} from "lucide-react";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const STATUS_COLORS: Record<NeedStatus, string> = {
  "جديد": "bg-blue-100 text-blue-800",
  "تحت الإجراء": "bg-amber-100 text-amber-800",
  "تم التغطية": "bg-green-100 text-green-800",
  "مغلق": "bg-gray-100 text-gray-600",
};

const ALL_STATUSES: NeedStatus[] = ["جديد", "تحت الإجراء", "تم التغطية", "مغلق"];

// ─── School search autocomplete ──────────────────────────────────────────────

interface SchoolPickerProps {
  schools: School[];
  selected: School | null;
  onSelect: (s: School | null) => void;
}

function SchoolPicker({ schools, selected, onSelect }: SchoolPickerProps) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const results = useMemo(() => {
    if (!query.trim()) return schools.slice(0, 10);
    const q = query.trim();
    return schools.filter(
      (s) =>
        s.name.includes(q) ||
        s.principalName.includes(q) ||
        s.principalNationalId.includes(q)
    ).slice(0, 12);
  }, [query, schools]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث باسم المدرسة أو المدير/ة أو السجل المدني..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pr-9 pl-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
        {selected && (
          <button
            type="button"
            onClick={() => { onSelect(null); setQuery(""); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-border rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-right px-4 py-2.5 hover:bg-muted/60 transition-colors border-b border-border last:border-0"
              onClick={() => { onSelect(s); setQuery(s.name); setOpen(false); }}
            >
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.governorate} — المدير/ة: {s.principalName}
              </p>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.trim() && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-border rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-muted-foreground text-center">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}

// ─── Add modal ───────────────────────────────────────────────────────────────

interface AddModalProps {
  schools: School[];
  onClose: () => void;
  onSave: (need: Need) => void;
}

function AddModal({ schools, onClose, onSave }: AddModalProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [needType, setNeedType] = useState<NeedType>("حارس");
  const [reason, setReason] = useState("");
  const [requestDate, setRequestDate] = useState(todayStr());
  const [status, setStatus] = useState<NeedStatus>("جديد");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSchool) { setError("يرجى اختيار المدرسة أولاً"); return; }
    if (!reason.trim()) { setError("يرجى كتابة سبب الاحتياج"); return; }
    if (!requestDate) { setError("يرجى تحديد تاريخ الطلب"); return; }
    setError("");

    const need: Need = {
      id: generateId(),
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      governorate: selectedSchool.governorate,
      principalName: selectedSchool.principalName,
      principalNationalId: selectedSchool.principalNationalId,
      principalPhone: selectedSchool.principalPhone,
      needType,
      reason: reason.trim(),
      requestDate,
      status,
      createdAt: new Date().toISOString(),
    };
    onSave(need);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-base">إضافة احتياج جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* School search */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              المدرسة <span className="text-red-500">*</span>
            </label>
            {schools.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                لا توجد مدارس في النظام. يرجى استيراد البيانات أولاً.
              </div>
            ) : (
              <SchoolPicker schools={schools} selected={selectedSchool} onSelect={setSelectedSchool} />
            )}
          </div>

          {/* Auto-filled school info */}
          {selectedSchool && (
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-semibold text-xs">بيانات المدرسة (مُعبّأة تلقائياً)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">المحافظة</p>
                  <p className="font-medium text-foreground">{selectedSchool.governorate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">المرحلة / النوع</p>
                  <p className="font-medium text-foreground">{selectedSchool.level} — {selectedSchool.type}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2 mt-1 flex items-start gap-2">
                <UserCheck className="w-3.5 h-3.5 text-primary mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="text-muted-foreground">المدير/ة: <span className="text-foreground font-medium">{selectedSchool.principalName}</span></p>
                  <p className="text-muted-foreground">السجل: <span className="text-foreground font-medium">{selectedSchool.principalNationalId}</span></p>
                  <p className="text-muted-foreground">الجوال: <span className="text-foreground font-medium">{selectedSchool.principalPhone}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Need type */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              نوع الاحتياج <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(["حارس", "حارسة"] as NeedType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNeedType(t)}
                  className={`
                    flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                    ${needType === t
                      ? "border-primary bg-primary text-white"
                      : "border-border text-foreground hover:border-primary/40"}
                  `}
                >
                  {t === "حارس" ? "👮 حارس" : "👩‍💼 حارسة"}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              سبب الاحتياج <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب الاحتياج بالتفصيل..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                تاريخ الطلب <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">حالة الطلب</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as NeedStatus)}
                  className="w-full appearance-none px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              حفظ الاحتياج
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status dropdown cell ────────────────────────────────────────────────────

function StatusCell({ need, onChange }: { need: Need; onChange: (s: NeedStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`badge ${STATUS_COLORS[need.status]} cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity`}
      >
        {need.status}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-xl shadow-lg z-20 min-w-36 overflow-hidden">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              className="w-full text-right px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
              onClick={() => { onChange(s); setOpen(false); }}
            >
              <span className={`badge ${STATUS_COLORS[s]}`}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Needs() {
  const { schools, needs, addNeed, updateNeedStatus, deleteNeed } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<NeedStatus | "الكل">("الكل");
  const [filterType, setFilterType] = useState<NeedType | "الكل">("الكل");

  const filtered = useMemo(() => {
    return needs.filter((n) => {
      const matchSearch =
        !search.trim() ||
        n.schoolName.includes(search) ||
        n.governorate.includes(search) ||
        n.reason.includes(search) ||
        n.principalName.includes(search);
      const matchStatus = filterStatus === "الكل" || n.status === filterStatus;
      const matchType = filterType === "الكل" || n.needType === filterType;
      return matchSearch && matchStatus && matchType;
    });
  }, [needs, search, filterStatus, filterType]);

  const stats = useMemo(() => ({
    total: needs.length,
    new: needs.filter((n) => n.status === "جديد").length,
    inProgress: needs.filter((n) => n.status === "تحت الإجراء").length,
    covered: needs.filter((n) => n.status === "تم التغطية").length,
    closed: needs.filter((n) => n.status === "مغلق").length,
  }), [needs]);

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">الاحتياج</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            إدارة طلبات احتياج الحراس للمدارس
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة احتياج
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "إجمالي الطلبات", value: stats.total, color: "bg-white border-border text-foreground" },
          { label: "جديد", value: stats.new, color: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "تحت الإجراء", value: stats.inProgress, color: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "تم التغطية", value: stats.covered, color: "bg-green-50 border-green-200 text-green-800" },
          { label: "مغلق", value: stats.closed, color: "bg-gray-50 border-gray-200 text-gray-700" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-3.5 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالمدرسة أو المحافظة أو السبب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as NeedStatus | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="الكل">كل الحالات</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NeedType | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="الكل">كل الأنواع</option>
            <option value="حارس">حارس</option>
            <option value="حارسة">حارسة</option>
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {needs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">لا توجد بيانات حالياً</p>
            <p className="text-muted-foreground text-sm mt-1">
              انقر على "إضافة احتياج" لتسجيل طلب جديد
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            لا توجد نتائج مطابقة للبحث أو الفلتر
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>المدرسة</th>
                  <th>المحافظة</th>
                  <th>نوع الاحتياج</th>
                  <th>سبب الاحتياج</th>
                  <th>تاريخ الطلب</th>
                  <th>حالة الطلب</th>
                  <th className="w-14"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((need) => (
                  <tr key={need.id}>
                    <td>
                      <p className="font-medium text-foreground">{need.schoolName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {need.principalName}
                      </p>
                    </td>
                    <td>{need.governorate}</td>
                    <td>
                      <span className={`badge ${need.needType === "حارس" ? "badge-male" : "badge-female"}`}>
                        {need.needType}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm text-foreground max-w-48 line-clamp-2">
                        {need.reason}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {formatDate(need.requestDate)}
                      </div>
                    </td>
                    <td>
                      <StatusCell
                        need={need}
                        onChange={(s) => updateNeedStatus(need.id, s)}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
                            deleteNeed(need.id);
                          }
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="حذف الطلب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddModal
          schools={schools}
          onClose={() => setShowModal(false)}
          onSave={addNeed}
        />
      )}
    </div>
  );
}

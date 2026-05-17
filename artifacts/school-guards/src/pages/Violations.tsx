import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import type { Violation, ViolationStatus, ViolationType, ReporterSource, School, Guard } from "../types";
import {
  Plus,
  Search,
  AlertTriangle,
  X,
  ChevronDown,
  Calendar,
  Eye,
  Trash2,
  Hash,
  Shield,
  Building2,
} from "lucide-react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function genCaseNumber() {
  return `MKH-${Math.floor(1000 + Math.random() * 9000)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIOLATION_TYPES: ViolationType[] = ["شكوى", "ملاحظة", "بلاغ", "مخالفة", "أخرى"];
const REPORTER_SOURCES: ReporterSource[] = ["مدير مدرسة", "ولي أمر", "مشرف", "جهة حكومية", "أخرى"];
const ALL_STATUSES: ViolationStatus[] = ["جديد", "تحت الإجراء", "مغلق"];

const STATUS_COLORS: Record<ViolationStatus, string> = {
  "جديد": "bg-blue-100 text-blue-800",
  "تحت الإجراء": "bg-amber-100 text-amber-800",
  "مغلق": "bg-gray-100 text-gray-600",
};

const TYPE_COLORS: Record<ViolationType, string> = {
  "شكوى": "bg-red-50 text-red-700",
  "ملاحظة": "bg-blue-50 text-blue-700",
  "بلاغ": "bg-amber-50 text-amber-700",
  "مخالفة": "bg-rose-50 text-rose-800",
  "أخرى": "bg-gray-50 text-gray-600",
};

const SOURCE_COLORS: Record<ReporterSource, string> = {
  "مدير مدرسة": "bg-teal-50 text-teal-700",
  "ولي أمر": "bg-indigo-50 text-indigo-700",
  "مشرف": "bg-purple-50 text-purple-700",
  "جهة حكومية": "bg-green-50 text-green-700",
  "أخرى": "bg-gray-50 text-gray-600",
};

// ─── School picker ────────────────────────────────────────────────────────────

function SchoolPicker({ schools, selected, onSelect }: {
  schools: School[];
  selected: School | null;
  onSelect: (s: School | null) => void;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (selected) setQuery(selected.name); }, [selected]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return schools.slice(0, 10);
    return schools.filter((s) => s.name.includes(q) || s.governorate.includes(q) || s.principalName.includes(q)).slice(0, 12);
  }, [query, schools]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="ابحث باسم المدرسة..." value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="w-full pr-9 pl-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        {selected && (
          <button type="button" onClick={() => { onSelect(null); setQuery(""); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-border rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {results.map((s) => (
            <button key={s.id} type="button"
              className="w-full text-right px-4 py-2.5 hover:bg-muted/60 transition-colors border-b border-border last:border-0"
              onClick={() => { onSelect(s); setQuery(s.name); setOpen(false); }}>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.governorate} — {s.principalName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Guard picker ─────────────────────────────────────────────────────────────

function GuardPicker({ guards, selected, onSelect }: {
  guards: Guard[];
  selected: Guard | null;
  onSelect: (g: Guard | null) => void;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (selected) setQuery(selected.name); else setQuery(""); }, [selected]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return guards.slice(0, 10);
    return guards.filter((g) => g.name.includes(q) || g.nationalId.includes(q) || (g.schoolName || "").includes(q)).slice(0, 12);
  }, [query, guards]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="ابحث باسم الحارس أو السجل المدني (اختياري)..." value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="w-full pr-9 pl-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        {selected && (
          <button type="button" onClick={() => { onSelect(null); setQuery(""); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-border rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {results.map((g) => (
            <button key={g.id} type="button"
              className="w-full text-right px-4 py-2.5 hover:bg-muted/60 transition-colors border-b border-border last:border-0"
              onClick={() => { onSelect(g); setQuery(g.name); setOpen(false); }}>
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.nationalId} — {g.schoolName || "بدون مدرسة"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Select field ─────────────────────────────────────────────────────────────

function SelectField<T extends string>({ label, value, options, onChange, required }: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 mr-0.5">*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-foreground mb-1.5">
      {children}{required && <span className="text-red-500 mr-0.5">*</span>}
    </label>
  );
}

// ─── Add modal ────────────────────────────────────────────────────────────────

function AddModal({ schools, guards, onClose, onSave }: {
  schools: School[];
  guards: Guard[];
  onClose: () => void;
  onSave: (v: Violation) => void;
}) {
  const [type, setType] = useState<ViolationType>("مخالفة");
  const [reporterName, setReporterName] = useState("");
  const [reporterSource, setReporterSource] = useState<ReporterSource>("مدير مدرسة");
  const [school, setSchool] = useState<School | null>(null);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [description, setDescription] = useState("");
  const [reportDate, setReportDate] = useState(todayStr());
  const [status, setStatus] = useState<ViolationStatus>("جديد");
  const [actionTaken, setActionTaken] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reporterName.trim()) { setError("يرجى إدخال اسم مقدم البلاغ"); return; }
    if (!school && !description.trim()) { setError("يرجى اختيار المدرسة أو كتابة الوصف"); return; }
    if (!description.trim()) { setError("يرجى كتابة وصف الحالة"); return; }
    setError("");

    onSave({
      id: genId(),
      caseNumber: genCaseNumber(),
      type,
      reporterName: reporterName.trim(),
      reporterSource,
      schoolId: school?.id ?? null,
      schoolName: school?.name ?? "",
      governorate: school?.governorate ?? "",
      guardId: guard?.id ?? null,
      guardName: guard?.name ?? "",
      description: description.trim(),
      reportDate,
      status,
      actionTaken: actionTaken.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-base">إضافة مخالفة / بلاغ جديد</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <FieldLabel required>نوع الحالة</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {VIOLATION_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all
                    ${type === t ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Reporter */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel required>مقدم البلاغ</FieldLabel>
              <input type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)}
                placeholder="اسم مقدم البلاغ"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <SelectField label="جهة البلاغ" value={reporterSource} options={REPORTER_SOURCES}
                onChange={setReporterSource} required />
            </div>
          </div>

          {/* School */}
          <div>
            <FieldLabel>المدرسة</FieldLabel>
            {schools.length > 0
              ? <SchoolPicker schools={schools} selected={school} onSelect={setSchool} />
              : <div className="bg-muted/40 rounded-lg px-4 py-2.5 text-sm text-muted-foreground">لا توجد مدارس في النظام</div>
            }
          </div>

          {school && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">{school.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">المحافظة: {school.governorate} — {school.principalName}</p>
              </div>
            </div>
          )}

          {/* Guard */}
          <div>
            <FieldLabel>الحارس المرتبط</FieldLabel>
            {guards.length > 0
              ? <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
              : <div className="bg-muted/40 rounded-lg px-4 py-2.5 text-sm text-muted-foreground">لا يوجد حراس في النظام</div>
            }
          </div>

          {guard && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">{guard.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{guard.nationalId} — {guard.schoolName || "بدون مدرسة"}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <FieldLabel required>وصف الحالة</FieldLabel>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="اكتب وصفاً تفصيلياً للحالة..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>تاريخ البلاغ</FieldLabel>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <SelectField label="حالة المعالجة" value={status} options={ALL_STATUSES}
              onChange={setStatus} required />
          </div>

          {/* Action taken */}
          <div>
            <FieldLabel>الإجراء المتخذ</FieldLabel>
            <textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} rows={2}
              placeholder="اذكر الإجراء المتخذ إن وجد (اختياري)..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Notes */}
          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
              حفظ الحالة
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Details modal ────────────────────────────────────────────────────────────

function DetailsModal({ violation, onClose, onUpdate, onDelete }: {
  violation: Violation;
  onClose: () => void;
  onUpdate: (patch: Partial<Violation>) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState<ViolationStatus>(violation.status);
  const [actionTaken, setActionTaken] = useState(violation.actionTaken);
  const [notes, setNotes] = useState(violation.notes);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onUpdate({ status, actionTaken, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
        <span className="text-muted-foreground text-sm w-36 flex-shrink-0">{label}</span>
        <span className="text-foreground text-sm font-medium">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{violation.caseNumber}</p>
              <p className="text-white/70 text-xs">{violation.type}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Case info */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">بيانات الحالة</p>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="رقم الحالة" value={violation.caseNumber} />
              <InfoRow label="نوع الحالة" value={violation.type} />
              <InfoRow label="مقدم البلاغ" value={violation.reporterName} />
              <InfoRow label="جهة البلاغ" value={violation.reporterSource} />
              <InfoRow label="تاريخ البلاغ" value={formatDate(violation.reportDate)} />
            </div>
          </section>

          {/* School & Guard */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">المدرسة والحارس</p>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="المدرسة" value={violation.schoolName} />
              <InfoRow label="المحافظة" value={violation.governorate} />
              <InfoRow label="الحارس المرتبط" value={violation.guardName} />
            </div>
          </section>

          {/* Description */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">وصف الحالة</p>
            <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed">
              {violation.description}
            </div>
          </section>

          {/* Editable section */}
          <section className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تحديث الحالة</p>

            <div>
              <FieldLabel>حالة المعالجة</FieldLabel>
              <div className="flex gap-2">
                {ALL_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                      ${status === s ? `border-transparent ${STATUS_COLORS[s]}` : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>الإجراء المتخذ</FieldLabel>
              <textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} rows={3}
                placeholder="أدخل الإجراء المتخذ..."
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>

            <div>
              <FieldLabel>ملاحظات</FieldLabel>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors
                  ${saved ? "bg-green-600 text-white" : "bg-primary text-white hover:bg-primary/90"}`}>
                {saved ? "✓ تم الحفظ" : "حفظ التحديثات"}
              </button>
              <button onClick={() => { if (confirm("هل أنت متأكد من حذف هذه الحالة؟")) { onDelete(); onClose(); } }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Status dropdown in table ─────────────────────────────────────────────────

function StatusCell({ status, onChange }: { status: ViolationStatus; onChange: (s: ViolationStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`badge ${STATUS_COLORS[status]} cursor-pointer flex items-center gap-1 hover:opacity-80`}>
        {status}<ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-xl shadow-lg z-20 min-w-36 overflow-hidden">
          {ALL_STATUSES.map((s) => (
            <button key={s} className="w-full text-right px-3 py-2 text-xs hover:bg-muted transition-colors"
              onClick={() => { onChange(s); setOpen(false); }}>
              <span className={`badge ${STATUS_COLORS[s]}`}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Violations() {
  const { schools, guards, violations, addViolation, updateViolation, deleteViolation } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Violation | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ViolationStatus | "الكل">("الكل");
  const [filterType, setFilterType] = useState<ViolationType | "الكل">("الكل");
  const [filterSource, setFilterSource] = useState<ReporterSource | "الكل">("الكل");

  const filtered = useMemo(() =>
    violations.filter((v) => {
      const q = search.trim();
      const matchSearch = !q ||
        v.caseNumber.includes(q) ||
        v.schoolName.includes(q) ||
        v.governorate.includes(q) ||
        v.guardName.includes(q) ||
        v.reporterName.includes(q) ||
        v.description.includes(q);
      return matchSearch &&
        (filterStatus === "الكل" || v.status === filterStatus) &&
        (filterType === "الكل" || v.type === filterType) &&
        (filterSource === "الكل" || v.reporterSource === filterSource);
    }),
    [violations, search, filterStatus, filterType, filterSource]
  );

  const stats = useMemo(() => ({
    total: violations.length,
    new: violations.filter((v) => v.status === "جديد").length,
    inProgress: violations.filter((v) => v.status === "تحت الإجراء").length,
    closed: violations.filter((v) => v.status === "مغلق").length,
    byType: VIOLATION_TYPES.reduce((acc, t) => {
      acc[t] = violations.filter((v) => v.type === t).length;
      return acc;
    }, {} as Record<ViolationType, number>),
  }), [violations]);

  const selectedFull = selected ? violations.find((v) => v.id === selected.id) ?? selected : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">المخالفات</h2>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة الشكاوى والمخالفات والبلاغات المتعلقة بالحراس والمدارس</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          إضافة مخالفة
        </button>
      </div>

      {/* Status stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الحالات", value: stats.total, color: "bg-white border-border" },
          { label: "جديد", value: stats.new, color: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "تحت الإجراء", value: stats.inProgress, color: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "مغلق", value: stats.closed, color: "bg-gray-50 border-gray-200 text-gray-700" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-3.5 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      {violations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {VIOLATION_TYPES.filter((t) => stats.byType[t] > 0).map((t) => (
            <div key={t} className={`badge ${TYPE_COLORS[t]} flex items-center gap-1.5 text-xs`}>
              {t}
              <span className="font-bold">{stats.byType[t]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث برقم الحالة أو المدرسة أو الحارس أو الوصف..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {[
          {
            value: filterStatus, onChange: (v: string) => setFilterStatus(v as ViolationStatus | "الكل"),
            options: ["الكل", ...ALL_STATUSES], placeholder: "كل الحالات",
          },
          {
            value: filterType, onChange: (v: string) => setFilterType(v as ViolationType | "الكل"),
            options: ["الكل", ...VIOLATION_TYPES], placeholder: "كل الأنواع",
          },
          {
            value: filterSource, onChange: (v: string) => setFilterSource(v as ReporterSource | "الكل"),
            options: ["الكل", ...REPORTER_SOURCES], placeholder: "كل الجهات",
          },
        ].map((f, i) => (
          <div key={i} className="relative">
            <select value={f.value} onChange={(e) => f.onChange(e.target.value)}
              className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {f.options.map((o) => <option key={o} value={o}>{o === "الكل" ? f.placeholder : o}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {violations.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">لا توجد بيانات حالياً</p>
            <p className="text-muted-foreground text-sm mt-1">انقر على "إضافة مخالفة" لتسجيل حالة جديدة</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الحالة</th>
                  <th>نوع الحالة</th>
                  <th>مقدم البلاغ</th>
                  <th>جهة البلاغ</th>
                  <th>المدرسة</th>
                  <th>الحارس المرتبط</th>
                  <th>تاريخ البلاغ</th>
                  <th>حالة المعالجة</th>
                  <th className="w-20">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-rose-700">
                        <Hash className="w-3.5 h-3.5" />
                        {v.caseNumber}
                      </div>
                    </td>
                    <td><span className={`badge ${TYPE_COLORS[v.type]}`}>{v.type}</span></td>
                    <td>
                      <p className="text-sm font-medium text-foreground">{v.reporterName}</p>
                    </td>
                    <td><span className={`badge ${SOURCE_COLORS[v.reporterSource]}`}>{v.reporterSource}</span></td>
                    <td>
                      <p className="text-sm font-medium text-foreground">{v.schoolName || "—"}</p>
                      {v.governorate && <p className="text-xs text-muted-foreground">{v.governorate}</p>}
                    </td>
                    <td>
                      {v.guardName
                        ? <p className="text-sm text-foreground">{v.guardName}</p>
                        : <span className="text-muted-foreground text-sm">—</span>
                      }
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {formatDate(v.reportDate)}
                      </div>
                    </td>
                    <td>
                      <StatusCell status={v.status} onChange={(s) => updateViolation(v.id, { status: s })} />
                    </td>
                    <td>
                      <button onClick={() => setSelected(v)}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal schools={schools} guards={guards} onClose={() => setShowAdd(false)} onSave={addViolation} />
      )}

      {selectedFull && (
        <DetailsModal
          violation={selectedFull}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updateViolation(selectedFull.id, patch)}
          onDelete={() => { deleteViolation(selectedFull.id); setSelected(null); }}
        />
      )}
    </div>
  );
}

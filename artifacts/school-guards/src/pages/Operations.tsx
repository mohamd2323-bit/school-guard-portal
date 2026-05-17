import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import type { Guard, School, Operation, OperationType } from "../types";
import {
  ArrowLeftRight,
  UserPlus,
  Briefcase,
  Wallet,
  Pencil,
  Search,
  X,
  ChevronDown,
  Calendar,
  Settings2,
  Clock,
  Eye,
  Printer,
  FileDown,
  Copy,
  Check,
  FileText,
  Filter,
  FileSpreadsheet,
  User2,
} from "lucide-react";

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return d; }
}

function makeOp(
  type: OperationType,
  guardId: string | null,
  guardName: string,
  date: string,
  notes: string,
  details: Record<string, string>,
  performedBy = "النظام"
): Operation {
  return { id: genId(), type, guardId, guardName, date, notes, createdAt: new Date().toISOString(), details, performedBy };
}

// ─── OP meta ─────────────────────────────────────────────────────────────────

const OP_COLORS: Record<OperationType, string> = {
  "نقل حارس":     "bg-indigo-100 text-indigo-800",
  "إضافة حارس":   "bg-green-100 text-green-800",
  "تكليف حارس":   "bg-amber-100 text-amber-800",
  "بدل حارس":     "bg-teal-100 text-teal-800",
  "تعديل بيانات": "bg-purple-100 text-purple-800",
  "إلغاء تكليف":  "bg-rose-100 text-rose-800",
  "إنهاء نقل":    "bg-orange-100 text-orange-800",
  "أخرى":         "bg-gray-100 text-gray-700",
};

const OP_ICON: Record<OperationType, React.ReactNode> = {
  "نقل حارس":     <ArrowLeftRight className="w-3 h-3" />,
  "إضافة حارس":   <UserPlus className="w-3 h-3" />,
  "تكليف حارس":   <Briefcase className="w-3 h-3" />,
  "بدل حارس":     <Wallet className="w-3 h-3" />,
  "تعديل بيانات": <Pencil className="w-3 h-3" />,
  "إلغاء تكليف":  <X className="w-3 h-3" />,
  "إنهاء نقل":    <ArrowLeftRight className="w-3 h-3" />,
  "أخرى":         <Settings2 className="w-3 h-3" />,
};

const ALL_OP_TYPES: OperationType[] = [
  "نقل حارس", "تكليف حارس", "بدل حارس", "تعديل بيانات",
  "إضافة حارس", "إلغاء تكليف", "إنهاء نقل", "أخرى",
];

function opSummary(op: Operation): string {
  const d = op.details;
  switch (op.type) {
    case "نقل حارس":
      return `من "${d.fromSchoolName || "—"}" إلى "${d.toSchoolName || "—"}"`;
    case "إنهاء نقل":
      return `إنهاء نقل من "${d.fromSchoolName || "—"}" إلى "${d.toSchoolName || "—"}"`;
    case "إضافة حارس":
      return `مدرسة: ${d.schoolName || "—"} — محافظة: ${d.governorate || "—"}`;
    case "تكليف حارس":
      return `${d.entity || "—"} (${d.startDate || ""}–${d.endDate || ""})`;
    case "إلغاء تكليف":
      return `إلغاء تكليف: ${d.entity || "—"}`;
    case "بدل حارس":
      return `حالة البدل: ${d.allowanceStatus || "—"}`;
    case "تعديل بيانات":
      return d.summary || "تعديل البيانات الأساسية";
    case "أخرى":
      return d.summary || op.notes || "عملية أخرى";
    default:
      return "";
  }
}

// ─── Guard picker ─────────────────────────────────────────────────────────────

function GuardPicker({
  guards,
  selected,
  onSelect,
  placeholder = "ابحث باسم الحارس أو السجل المدني...",
}: {
  guards: Guard[];
  selected: Guard | null;
  onSelect: (g: Guard | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const results = useMemo(() => {
    if (!query.trim()) return guards.slice(0, 10);
    const q = query.trim();
    return guards.filter(
      (g) => g.name.includes(q) || g.nationalId.includes(q) || (g.schoolName || "").includes(q)
    ).slice(0, 12);
  }, [query, guards]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="w-full pr-9 pl-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {g.nationalId} — {g.schoolName || "بدون مدرسة"} — {g.gender}
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

// ─── School picker ────────────────────────────────────────────────────────────

function SchoolPicker({
  schools,
  selected,
  onSelect,
  placeholder = "ابحث باسم المدرسة...",
}: {
  schools: School[];
  selected: School | null;
  onSelect: (s: School | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const results = useMemo(() => {
    if (!query.trim()) return schools.slice(0, 10);
    const q = query.trim();
    return schools.filter(
      (s) => s.name.includes(q) || s.governorate.includes(q) || s.principalName.includes(q)
    ).slice(0, 12);
  }, [query, schools]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="w-full pr-9 pl-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
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
      {open && results.length === 0 && query.trim() && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-border rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-muted-foreground text-center">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              {icon}
            </div>
            <h2 className="text-white font-bold text-base">{title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
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

function ErrorBox({ msg }: { msg: string }) {
  return msg ? (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{msg}</div>
  ) : null;
}

function SubmitRow({ onClose, label = "حفظ العملية" }: { onClose: () => void; label?: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit"
        className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
        {label}
      </button>
      <button type="button" onClick={onClose}
        className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
        إلغاء
      </button>
    </div>
  );
}

// ─── 1. Transfer modal ────────────────────────────────────────────────────────

function TransferModal({ guards, schools, onClose }: { guards: Guard[]; schools: School[]; onClose: () => void }) {
  const { updateGuard } = useStore();
  const { currentUser } = useUsers();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [toSchool, setToSchool] = useState<School | null>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    if (!toSchool) { setError("يرجى اختيار المدرسة الجديدة"); return; }
    if (!reason.trim()) { setError("يرجى كتابة سبب النقل"); return; }
    setError("");

    const op = makeOp("نقل حارس", guard.id, guard.name, date, notes, {
      fromSchoolName: guard.schoolName || "بدون مدرسة",
      fromSchoolId: guard.schoolId || "",
      toSchoolName: toSchool.name,
      toSchoolId: toSchool.id,
      reason,
    }, currentUser?.name ?? "النظام");
    updateGuard(guard.id, { schoolId: toSchool.id, schoolName: toSchool.name, governorate: toSchool.governorate }, op);
    onClose();
  }

  return (
    <Modal title="نقل حارس من مدرسة إلى مدرسة" icon={<ArrowLeftRight className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
        </div>

        {guard && (
          <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm space-y-1">
            <p className="text-muted-foreground text-xs font-semibold mb-1">المدرسة الحالية</p>
            <p className="font-medium text-foreground">{guard.schoolName || "بدون مدرسة"}</p>
            {guard.governorate && <p className="text-xs text-muted-foreground">المحافظة: {guard.governorate}</p>}
          </div>
        )}

        <div>
          <FieldLabel required>المدرسة الجديدة</FieldLabel>
          <SchoolPicker schools={schools} selected={toSchool} onSelect={setToSchool} placeholder="ابحث عن المدرسة الجديدة..." />
        </div>

        {toSchool && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            <p className="text-green-800 font-medium">{toSchool.name}</p>
            <p className="text-green-700 text-xs mt-0.5">{toSchool.governorate} — {toSchool.principalName}</p>
          </div>
        )}

        <div>
          <FieldLabel required>سبب النقل</FieldLabel>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="اكتب سبب النقل..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel required>تاريخ النقل</FieldLabel>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <ErrorBox msg={error} />
        <SubmitRow onClose={onClose} label="تأكيد النقل" />
      </form>
    </Modal>
  );
}

// ─── 2. Add guard modal ───────────────────────────────────────────────────────

function AddGuardModal({ schools, onClose }: { schools: School[]; onClose: () => void }) {
  const { addGuard } = useStore();
  const { currentUser } = useUsers();
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"ذكر" | "أنثى">("ذكر");
  const [jobTitle, setJobTitle] = useState("");
  const [rank, setRank] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [governorate, setGovernorate] = useState("");
  const [status, setStatus] = useState<"نشط" | "غير نشط">("نشط");
  const [error, setError] = useState("");

  useEffect(() => {
    if (school) setGovernorate(school.governorate);
  }, [school]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("يرجى إدخال اسم الحارس"); return; }
    if (!nationalId.trim()) { setError("يرجى إدخال السجل المدني"); return; }
    setError("");

    const id = genId();
    const newGuard: Guard = {
      id,
      name: name.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      gender,
      status,
      schoolId: school?.id ?? null,
      schoolName: school?.name ?? null,
      jobTitle: jobTitle.trim(),
      rank: rank.trim(),
      governorate: governorate.trim(),
      region: "عسير",
    };
    const op = makeOp("إضافة حارس", id, name.trim(), todayStr(), "", {
      schoolName: school?.name || "بدون مدرسة",
      governorate: governorate.trim(),
      gender,
      jobTitle: jobTitle.trim(),
    }, currentUser?.name ?? "النظام");
    addGuard(newGuard, op);
    onClose();
  }

  return (
    <Modal title="إضافة حارس / حارسة جديد" icon={<UserPlus className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FieldLabel required>اسم الحارس</FieldLabel>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel required>السجل المدني</FieldLabel>
            <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)}
              placeholder="10 أرقام"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>رقم الجوال</FieldLabel>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <FieldLabel>الجنس</FieldLabel>
          <div className="flex gap-3">
            {(["ذكر", "أنثى"] as const).map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                  ${gender === g ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                {g === "ذكر" ? "👮 ذكر" : "👩 أنثى"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>المسمى الوظيفي</FieldLabel>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: حارس أمن"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>المرتبة / الدرجة</FieldLabel>
            <input type="text" value={rank} onChange={(e) => setRank(e.target.value)}
              placeholder="مثال: الثالثة"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <FieldLabel>المدرسة</FieldLabel>
          {schools.length > 0
            ? <SchoolPicker schools={schools} selected={school} onSelect={setSchool} />
            : <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5">لا توجد مدارس — سيُضاف بدون مدرسة</div>
          }
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>المحافظة</FieldLabel>
            <input type="text" value={governorate} onChange={(e) => setGovernorate(e.target.value)}
              placeholder="المحافظة"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>الحالة</FieldLabel>
            <div className="relative">
              <select value={status} onChange={(e) => setStatus(e.target.value as "نشط" | "غير نشط")}
                className="w-full appearance-none px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <ErrorBox msg={error} />
        <SubmitRow onClose={onClose} label="إضافة الحارس" />
      </form>
    </Modal>
  );
}

// ─── 3. Assignment modal ──────────────────────────────────────────────────────

type EntityType = "مدرسة" | "مبنى إداري" | "فعالية" | "نشاط" | "جهة أخرى";
const ENTITY_TYPES: EntityType[] = ["مدرسة", "مبنى إداري", "فعالية", "نشاط", "جهة أخرى"];

interface LetterData {
  guardName: string;
  nationalId: string;
  jobTitle: string;
  currentSchool: string;
  entity: string;
  entityType: EntityType;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string;
  refNumber: string;
  issueDate: string;
}

function genRef() {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${n}/${y}`;
}

function formatDateAr(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", calendar: "gregory" });
  } catch { return d; }
}

function buildLetterHTML(l: LetterData): string {
  const endLine = l.endDate
    ? `وحتى تاريخ ${formatDateAr(l.endDate)}`
    : "حتى إشعار آخر";

  /* Saudi Ministry of Education emblem — simplified SVG in teal */
  const emblemSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="90" height="90">
    <!-- Palm tree trunk -->
    <rect x="56" y="55" width="8" height="38" rx="3" fill="#1a7a6e"/>
    <!-- Palm fronds -->
    <ellipse cx="60" cy="38" rx="5" ry="18" fill="#1a7a6e" transform="rotate(-35 60 55)"/>
    <ellipse cx="60" cy="38" rx="5" ry="18" fill="#1a7a6e" transform="rotate(35 60 55)"/>
    <ellipse cx="60" cy="34" rx="4" ry="20" fill="#1a7a6e" transform="rotate(-65 60 55)"/>
    <ellipse cx="60" cy="34" rx="4" ry="20" fill="#1a7a6e" transform="rotate(65 60 55)"/>
    <ellipse cx="60" cy="32" rx="3" ry="16" fill="#1a7a6e" transform="rotate(-90 60 55)"/>
    <ellipse cx="60" cy="32" rx="3" ry="16" fill="#1a7a6e" transform="rotate(90 60 55)"/>
    <!-- Left sword -->
    <line x1="15" y1="90" x2="50" y2="55" stroke="#1a7a6e" stroke-width="4" stroke-linecap="round"/>
    <polygon points="10,95 15,90 20,98" fill="#1a7a6e"/>
    <rect x="10" y="86" width="14" height="4" rx="2" fill="#c8a84b" transform="rotate(-45 17 88)"/>
    <!-- Right sword -->
    <line x1="105" y1="90" x2="70" y2="55" stroke="#1a7a6e" stroke-width="4" stroke-linecap="round"/>
    <polygon points="110,95 105,90 100,98" fill="#1a7a6e"/>
    <rect x="96" y="86" width="14" height="4" rx="2" fill="#c8a84b" transform="rotate(45 103 88)"/>
    <!-- Base ground line -->
    <line x1="20" y1="94" x2="100" y2="94" stroke="#1a7a6e" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>خطاب تكليف — ${l.guardName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 2cm 2.5cm 2.5cm 2.5cm;
    }

    body {
      font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
      font-size: 13.5px;
      color: #1a1a1a;
      direction: rtl;
      line-height: 1.85;
      background: #fff;
    }

    .page {
      max-width: 750px;
      margin: 0 auto;
      padding: 32px 40px 40px;
    }

    /* ── Official Header ── */
    .letterhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      margin-bottom: 0;
      border-bottom: 4px double #1a7a6e;
    }

    /* Right block: logo + identity */
    .identity-block {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }

    .emblem-wrapper {
      flex-shrink: 0;
      width: 90px;
      height: 90px;
    }

    .identity-text {
      text-align: right;
    }

    .id-kingdom {
      font-size: 11.5px;
      color: #555;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .id-ministry {
      font-size: 17px;
      font-weight: 900;
      color: #1a7a6e;
      margin-bottom: 2px;
      letter-spacing: 0.3px;
    }

    .id-dept {
      font-size: 12px;
      color: #444;
      font-weight: 600;
      margin-bottom: 1px;
    }

    .id-sub {
      font-size: 11.5px;
      color: #666;
    }

    /* Left block: Bismillah / decorative */
    .header-left {
      text-align: center;
      flex-shrink: 0;
      width: 120px;
    }

    .bismillah {
      font-size: 15px;
      color: #1a7a6e;
      font-weight: bold;
      line-height: 1.6;
    }

    .header-sub-line {
      font-size: 10px;
      color: #aaa;
      margin-top: 4px;
    }

    /* ── Reference bar ── */
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f4faf9;
      border: 1px solid #c8e6e0;
      border-radius: 6px;
      padding: 9px 16px;
      margin: 18px 0;
      font-size: 12px;
      color: #444;
    }

    .meta-bar .meta-item { display: flex; align-items: center; gap: 6px; }
    .meta-bar .meta-label { color: #777; }
    .meta-bar .meta-value { font-weight: 700; color: #1a7a6e; font-size: 13px; }

    /* ── Recipient block ── */
    .recipient {
      border: 1px solid #d0ece7;
      border-right: 5px solid #1a7a6e;
      border-radius: 0 8px 8px 0;
      background: #f7fdfc;
      padding: 13px 18px 13px 14px;
      margin-bottom: 20px;
    }

    .recipient-label {
      font-size: 11px;
      color: #888;
      margin-bottom: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .recipient-name {
      font-size: 17px;
      font-weight: 800;
      color: #111;
      margin-bottom: 6px;
    }

    .recipient-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 20px;
      font-size: 12.5px;
      color: #555;
    }

    .recipient-details strong { color: #1a1a1a; font-weight: 700; }

    /* ── Subject line ── */
    .subject {
      text-align: center;
      font-size: 16px;
      font-weight: 900;
      color: #fff;
      background: #1a7a6e;
      border-radius: 6px;
      padding: 9px 20px;
      margin-bottom: 22px;
      letter-spacing: 0.5px;
    }

    /* ── Body ── */
    .salutation { margin-bottom: 14px; font-size: 13.5px; color: #333; }

    .body-para {
      font-size: 13.5px;
      text-align: justify;
      margin-bottom: 14px;
      line-height: 2;
      color: #222;
    }

    .highlight {
      display: inline;
      font-weight: 800;
      color: #0d5c55;
      border-bottom: 2px solid #1a7a6e;
      padding: 0 2px;
    }

    .reason-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-right: 4px solid #16a34a;
      border-radius: 0 6px 6px 0;
      padding: 11px 15px;
      margin: 14px 0;
      font-size: 13px;
      color: #14532d;
    }

    .reason-box strong { font-weight: 700; }

    .notes-box {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-right: 4px solid #d97706;
      border-radius: 0 6px 6px 0;
      padding: 11px 15px;
      margin: 10px 0;
      font-size: 13px;
      color: #78350f;
    }

    .closing { margin-top: 20px; font-size: 13.5px; color: #333; }

    /* ── Signature area ── */
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 50px;
    }

    .sig-block {
      text-align: center;
      min-width: 200px;
    }

    .sig-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #1a7a6e;
    }

    .sig-dept {
      font-size: 12px;
      color: #555;
      margin-top: 3px;
    }

    .sig-line {
      margin: 38px auto 6px;
      width: 180px;
      border-bottom: 1.5px solid #1a7a6e;
    }

    .sig-label {
      font-size: 11px;
      color: #999;
    }

    .stamp-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: 2px dashed #1a7a6e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #1a7a6e;
      opacity: 0.3;
      text-align: center;
      line-height: 1.4;
      padding: 8px;
      margin-top: 20px;
    }

    /* ── Footer ── */
    .letter-footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #bbb;
    }

    /* ── Print rules ── */
    @media print {
      body { padding: 0 !important; }
      .page { padding: 0 !important; max-width: 100% !important; }
      .stamp-circle { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .subject { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ══ OFFICIAL HEADER ══ -->
  <div class="letterhead">

    <!-- RIGHT: Ministry logo + identity (RTL = appears on right) -->
    <div class="identity-block">
      <div class="emblem-wrapper">${emblemSVG}</div>
      <div class="identity-text">
        <p class="id-kingdom">المملكة العربية السعودية</p>
        <p class="id-ministry">وزارة التعليم</p>
        <p class="id-dept">إدارة الأمن والسلامة والمرافق</p>
        <p class="id-sub">الأمن المدرسي &mdash; تعليم عسير</p>
      </div>
    </div>

    <!-- LEFT: Bismillah -->
    <div class="header-left">
      <div class="bismillah">بسم الله<br>الرحمن الرحيم</div>
      <div class="header-sub-line">نظام إدارة الحراسات المدرسية</div>
    </div>

  </div>

  <!-- ══ REFERENCE BAR ══ -->
  <div class="meta-bar">
    <div class="meta-item">
      <span class="meta-label">رقم الخطاب:</span>
      <span class="meta-value">${l.refNumber}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">التاريخ:</span>
      <span class="meta-value">${formatDateAr(l.issueDate)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">الجهة:</span>
      <span class="meta-value">إدارة تعليم عسير</span>
    </div>
  </div>

  <!-- ══ RECIPIENT ══ -->
  <div class="recipient">
    <div class="recipient-label">المُكلَّف / المُكلَّفة</div>
    <div class="recipient-name">${l.guardName}</div>
    <div class="recipient-details">
      <div>السجل المدني: <strong>${l.nationalId}</strong></div>
      <div>المسمى الوظيفي: <strong>${l.jobTitle || "—"}</strong></div>
      <div>جهة العمل الحالية: <strong>${l.currentSchool}</strong></div>
    </div>
  </div>

  <!-- ══ SUBJECT ══ -->
  <div class="subject">خطاب تكليف رسمي</div>

  <!-- ══ BODY ══ -->
  <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>

  <div class="body-para">
    نفيدكم بأنه تقرر تكليفكم بالعمل في
    <span class="highlight">${l.entityType}: ${l.entity}</span>،
    وذلك اعتباراً من تاريخ
    <span class="highlight">${formatDateAr(l.startDate)}</span>
    ${endLine}.
  </div>

  ${l.reason ? `<div class="reason-box"><strong>سبب التكليف:</strong> ${l.reason}</div>` : ""}

  <div class="body-para">
    لذا يُرجى الانتقال إلى الجهة المذكورة في التاريخ المحدد،
    والالتزام بجميع تعليمات العمل والأنظمة واللوائح المعمول بها.
    وعلى الجهة المُكلَّف إليها التعاون التام وتهيئة بيئة العمل اللازمة.
  </div>

  ${l.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${l.notes}</div>` : ""}

  <p class="closing">وتفضلوا بقبول وافر التحية والاحترام،،،</p>

  <!-- ══ SIGNATURE ══ -->
  <div class="signature-area">
    <div class="sig-block">
      <div class="sig-title">مدير الأمن والسلامة والمرافق</div>
      <div class="sig-dept">إدارة تعليم عسير</div>
      <div class="sig-line"></div>
      <div class="sig-label">التوقيع والختم</div>
      <div class="stamp-circle">الختم<br>الرسمي</div>
    </div>
    <div style="width:120px"></div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="letter-footer">
    <span>وزارة التعليم — إدارة تعليم عسير — الأمن المدرسي</span>
    <span>رقم المرجع: ${l.refNumber}</span>
  </div>

</div>
</body>
</html>`;
}

function buildLetterText(l: LetterData): string {
  const endLine = l.endDate ? `وحتى تاريخ ${formatDateAr(l.endDate)}` : "حتى إشعار آخر";
  return [
    "════════════════════════════════════════",
    "         خطاب تكليف رسمي",
    "════════════════════════════════════════",
    "",
    "المملكة العربية السعودية — وزارة التعليم",
    "إدارة الأمن والسلامة والمرافق | الأمن المدرسي — تعليم عسير",
    "",
    `رقم الخطاب: ${l.refNumber}`,
    `التاريخ: ${formatDateAr(l.issueDate)}`,
    "",
    "────────────────────────────────────────",
    `إلى السيد / السيدة: ${l.guardName}`,
    `السجل المدني: ${l.nationalId}`,
    `المسمى الوظيفي: ${l.jobTitle || "—"}`,
    `جهة العمل الحالية: ${l.currentSchool}`,
    "────────────────────────────────────────",
    "",
    "الموضوع: خطاب تكليف",
    "",
    "السلام عليكم ورحمة الله وبركاته،",
    "",
    `نفيدكم بأنه تقرر تكليفكم بالعمل في ${l.entityType}: ${l.entity}،`,
    `وذلك اعتباراً من تاريخ ${formatDateAr(l.startDate)} ${endLine}.`,
    "",
    l.reason ? `سبب التكليف: ${l.reason}` : "",
    "",
    "لذا يُرجى الانتقال إلى الجهة المذكورة في التاريخ المحدد،",
    "والالتزام بجميع تعليمات العمل والأنظمة واللوائح المعمول بها.",
    "",
    l.notes ? `ملاحظات: ${l.notes}` : "",
    "",
    "وتفضلوا بقبول وافر التحية والاحترام،",
    "",
    "مدير الأمن والسلامة والمرافق",
    "إدارة تعليم عسير",
    "",
    "التوقيع: ___________________",
    "",
    "════════════════════════════════════════",
  ].filter((l) => l !== undefined).join("\n");
}

function openLetterWindow(html: string, autoPrint = false) {
  const win = window.open("", "_blank", "width=900,height=750");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  if (autoPrint) {
    win.onload = () => { win.focus(); win.print(); };
  }
}

function AssignmentModal({ guards, onClose }: { guards: Guard[]; onClose: () => void }) {
  const { addOperation } = useStore();
  const { currentUser } = useUsers();

  const [phase, setPhase] = useState<"form" | "letter">("form");
  const [letterData, setLetterData] = useState<LetterData | null>(null);
  const [copied, setCopied] = useState(false);

  const [guard, setGuard] = useState<Guard | null>(null);
  const [entity, setEntity] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("مدرسة");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    if (!entity.trim()) { setError("يرجى إدخال الجهة المكلف بها"); return; }
    if (!startDate) { setError("يرجى تحديد تاريخ البداية"); return; }
    setError("");

    const op = makeOp("تكليف حارس", guard.id, guard.name, startDate, notes, {
      entity: entity.trim(),
      entityType,
      startDate,
      endDate,
      reason: reason.trim(),
    }, currentUser?.name ?? "النظام");
    addOperation(op);

    const ld: LetterData = {
      guardName: guard.name,
      nationalId: guard.nationalId,
      jobTitle: guard.jobTitle || guard.jobType || "",
      currentSchool: guard.schoolName || "—",
      entity: entity.trim(),
      entityType,
      startDate,
      endDate,
      reason: reason.trim(),
      notes: notes.trim(),
      refNumber: genRef(),
      issueDate: todayStr(),
    };
    setLetterData(ld);
    setPhase("letter");
  }

  function handleCopy() {
    if (!letterData) return;
    navigator.clipboard.writeText(buildLetterText(letterData)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const letterHTML = letterData ? buildLetterHTML(letterData) : "";

  if (phase === "letter" && letterData) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
            style={{ background: "hsl(174 65% 28%)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">خطاب التكليف</h2>
                <p className="text-white/70 text-xs">{letterData.guardName} — رقم {letterData.refNumber}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Letter preview */}
          <div className="overflow-y-auto flex-1 p-6">
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              {/* Letterhead preview */}
              <div className="text-center py-5 px-6 border-b-2 border-double"
                style={{ borderColor: "#1a7a6e" }}>
                <p className="text-xs text-muted-foreground">المملكة العربية السعودية</p>
                <p className="text-base font-bold mt-0.5" style={{ color: "#1a7a6e" }}>وزارة التعليم</p>
                <p className="text-xs text-muted-foreground">إدارة الأمن والسلامة والمرافق | الأمن المدرسي — تعليم عسير</p>
              </div>

              <div className="p-6 space-y-4 text-sm leading-relaxed" style={{ fontFamily: "serif" }}>
                {/* Meta */}
                <div className="flex justify-between text-xs bg-muted/40 rounded-lg px-4 py-2.5 border border-border">
                  <span>رقم الخطاب: <span className="font-bold text-primary">{letterData.refNumber}</span></span>
                  <span>التاريخ: <span className="font-bold text-primary">{formatDateAr(letterData.issueDate)}</span></span>
                </div>

                {/* Recipient */}
                <div className="border-r-4 border-primary bg-primary/5 rounded-l-lg pr-4 pl-3 py-3">
                  <p className="text-muted-foreground text-xs">إلى السيد / السيدة</p>
                  <p className="font-bold text-base text-foreground mt-0.5">{letterData.guardName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    السجل المدني: <span className="font-mono font-semibold text-foreground">{letterData.nationalId}</span>
                    &ensp;|&ensp; {letterData.jobTitle || "—"}
                    &ensp;|&ensp; {letterData.currentSchool}
                  </p>
                </div>

                {/* Subject */}
                <div className="text-center font-bold text-primary border border-primary/30 rounded-lg py-2 bg-primary/5">
                  الموضوع: خطاب تكليف
                </div>

                <p className="text-muted-foreground text-xs">السلام عليكم ورحمة الله وبركاته،</p>

                <p className="leading-8">
                  نفيدكم بأنه تقرر تكليفكم بالعمل في{" "}
                  <span className="font-bold text-primary border-b border-primary">
                    {letterData.entityType}: {letterData.entity}
                  </span>
                  ، وذلك اعتباراً من تاريخ{" "}
                  <span className="font-bold">{formatDateAr(letterData.startDate)}</span>
                  {letterData.endDate
                    ? <> وحتى تاريخ <span className="font-bold">{formatDateAr(letterData.endDate)}</span></>
                    : " حتى إشعار آخر"
                  }.
                </p>

                {letterData.reason && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
                    <span className="font-semibold text-green-800">سبب التكليف: </span>
                    <span className="text-green-900">{letterData.reason}</span>
                  </div>
                )}

                <p className="leading-8">
                  لذا يُرجى الانتقال إلى الجهة المذكورة في التاريخ المحدد،
                  والالتزام بجميع تعليمات العمل والأنظمة واللوائح المعمول بها.
                </p>

                {letterData.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-900">
                    <span className="font-semibold">ملاحظات: </span>{letterData.notes}
                  </div>
                )}

                <p className="mt-2">وتفضلوا بقبول وافر التحية والاحترام،</p>

                {/* Signature */}
                <div className="text-center mt-8 pt-4">
                  <p className="font-bold text-sm" style={{ color: "#1a7a6e" }}>مدير الأمن والسلامة والمرافق</p>
                  <p className="text-xs text-muted-foreground mt-1">إدارة تعليم عسير</p>
                  <div className="mt-8 mx-auto w-40 border-b border-foreground/40"></div>
                  <p className="text-xs text-muted-foreground mt-1">التوقيع</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-border flex-shrink-0 bg-white rounded-b-2xl">
            <button onClick={() => openLetterWindow(letterHTML)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Eye className="w-4 h-4" />
              معاينة الخطاب
            </button>
            <button onClick={() => openLetterWindow(letterHTML, true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors">
              <Printer className="w-4 h-4" />
              طباعة الخطاب
            </button>
            <button onClick={() => {
              const win = window.open("", "_blank", "width=900,height=750");
              if (!win) return;
              win.document.write(letterHTML);
              win.document.close();
              win.onload = () => {
                win.focus();
                win.print();
              };
            }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors">
              <FileDown className="w-4 h-4" />
              تحميل PDF
            </button>
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                ${copied ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-border text-foreground hover:bg-muted/60"}`}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم النسخ!" : "نسخ الخطاب"}
            </button>
            <button onClick={onClose}
              className="mr-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal title="تكليف حارس" icon={<Briefcase className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
        </div>

        {guard && (
          <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">جهة العمل الحالية: </span>
              <span className="font-medium">{guard.schoolName || "بدون مدرسة"}</span>
              {guard.jobTitle || guard.jobType
                ? <span className="text-muted-foreground"> — {guard.jobTitle || guard.jobType}</span>
                : null}
            </div>
          </div>
        )}

        <div>
          <FieldLabel required>نوع الجهة المكلف بها</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {ENTITY_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setEntityType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                  ${entityType === t
                    ? "border-primary bg-primary text-white"
                    : "border-border text-foreground hover:border-primary/40"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel required>الجهة المكلف بها</FieldLabel>
          <input type="text" value={entity} onChange={(e) => setEntity(e.target.value)}
            placeholder={
              entityType === "مدرسة" ? "اسم المدرسة..." :
              entityType === "فعالية" ? "اسم الفعالية..." :
              entityType === "نشاط" ? "اسم النشاط..." :
              entityType === "مبنى إداري" ? "اسم المبنى الإداري..." :
              "اسم الجهة..."
            }
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel required>من تاريخ</FieldLabel>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>إلى تاريخ</FieldLabel>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <FieldLabel>سبب التكليف</FieldLabel>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="اكتب سبب التكليف..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div>
          <FieldLabel>ملاحظات</FieldLabel>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <ErrorBox msg={error} />

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            تسجيل التكليف وإنشاء الخطاب
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── 4. Allowance modal ───────────────────────────────────────────────────────

const ALLOWANCE_STATUSES = ["ممنوح", "موقوف", "مستحق", "تحت الإجراء", "مرفوض"];

function AllowanceModal({ guards, onClose }: { guards: Guard[]; onClose: () => void }) {
  const { addOperation } = useStore();
  const { currentUser } = useUsers();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState(ALLOWANCE_STATUSES[0]);
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    setError("");

    const op = makeOp("بدل حارس", guard.id, guard.name, date, notes, { allowanceStatus }, currentUser?.name ?? "النظام");
    addOperation(op);
    onClose();
  }

  return (
    <Modal title="إضافة بدل لحارس" icon={<Wallet className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
        </div>

        {guard && (
          <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">مدرسته: </span>
            <span className="font-medium">{guard.schoolName || "بدون مدرسة"}</span>
          </div>
        )}

        <div>
          <FieldLabel required>حالة البدل</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {ALLOWANCE_STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setAllowanceStatus(s)}
                className={`py-2 rounded-lg text-xs font-semibold border-2 transition-all
                  ${allowanceStatus === s ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel required>تاريخ الإجراء</FieldLabel>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <ErrorBox msg={error} />
        <SubmitRow onClose={onClose} label="حفظ البدل" />
      </form>
    </Modal>
  );
}

// ─── 5. Edit guard modal ──────────────────────────────────────────────────────

function EditGuardModal({ guards, schools, onClose }: { guards: Guard[]; schools: School[]; onClose: () => void }) {
  const { updateGuard } = useStore();
  const { currentUser } = useUsers();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"ذكر" | "أنثى">("ذكر");
  const [jobTitle, setJobTitle] = useState("");
  const [rank, setRank] = useState("");
  const [status, setStatus] = useState<"نشط" | "غير نشط">("نشط");
  const [school, setSchool] = useState<School | null>(null);
  const [governorate, setGovernorate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function loadGuard(g: Guard | null) {
    setGuard(g);
    if (!g) return;
    setName(g.name);
    setPhone(g.phone);
    setGender(g.gender);
    setJobTitle(g.jobTitle || g.jobType || "");
    setRank(g.rank || "");
    setStatus(g.status);
    setGovernorate(g.governorate || "");
    const linked = schools.find((s) => s.id === g.schoolId) || null;
    setSchool(linked);
  }

  useEffect(() => {
    if (school) setGovernorate(school.governorate);
  }, [school]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس أولاً"); return; }
    if (!name.trim()) { setError("يرجى إدخال اسم الحارس"); return; }
    setError("");

    const changes: string[] = [];
    if (name.trim() !== guard.name) changes.push("الاسم");
    if (phone.trim() !== guard.phone) changes.push("الجوال");
    if (gender !== guard.gender) changes.push("الجنس");
    if (jobTitle.trim() !== (guard.jobTitle || guard.jobType || "")) changes.push("المسمى");
    if (rank.trim() !== (guard.rank || "")) changes.push("المرتبة");
    if (status !== guard.status) changes.push("الحالة");
    if (school?.id !== guard.schoolId) changes.push("المدرسة");

    const patch: Partial<Guard> = {
      name: name.trim(),
      phone: phone.trim(),
      gender,
      jobTitle: jobTitle.trim(),
      rank: rank.trim(),
      status,
      schoolId: school?.id ?? null,
      schoolName: school?.name ?? null,
      governorate: governorate.trim(),
    };
    const op = makeOp("تعديل بيانات", guard.id, guard.name, todayStr(), notes, {
      summary: changes.length > 0 ? `تعديل: ${changes.join("، ")}` : "مراجعة البيانات",
    }, currentUser?.name ?? "النظام");
    updateGuard(guard.id, patch, op);
    onClose();
  }

  return (
    <Modal title="تعديل بيانات حارس" icon={<Pencil className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={loadGuard} />
        </div>

        {guard && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">تعديل البيانات</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel required>اسم الحارس</FieldLabel>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <FieldLabel>رقم الجوال</FieldLabel>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <FieldLabel>الجنس</FieldLabel>
                <div className="flex gap-2">
                  {(["ذكر", "أنثى"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                        ${gender === g ? "border-primary bg-primary text-white" : "border-border hover:border-primary/40"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>المسمى الوظيفي</FieldLabel>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <FieldLabel>المرتبة / الدرجة</FieldLabel>
                <input type="text" value={rank} onChange={(e) => setRank(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <FieldLabel>الحالة</FieldLabel>
                <div className="relative">
                  <select value={status} onChange={(e) => setStatus(e.target.value as "نشط" | "غير نشط")}
                    className="w-full appearance-none px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                    <option value="نشط">نشط</option>
                    <option value="غير نشط">غير نشط</option>
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="col-span-2">
                <FieldLabel>المدرسة</FieldLabel>
                {schools.length > 0
                  ? <SchoolPicker schools={schools} selected={school} onSelect={setSchool} />
                  : <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5">لا توجد مدارس في النظام</div>
                }
              </div>
              <div className="col-span-2">
                <FieldLabel>المحافظة</FieldLabel>
                <input type="text" value={governorate} onChange={(e) => setGovernorate(e.target.value)}
                  placeholder="المحافظة"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <FieldLabel>ملاحظات</FieldLabel>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="سبب التعديل أو ملاحظات..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </>
        )}

        <ErrorBox msg={error} />
        <SubmitRow onClose={onClose} label="حفظ التعديلات" />
      </form>
    </Modal>
  );
}

// ─── Operation cards data ─────────────────────────────────────────────────────

type ModalKey = "transfer" | "addGuard" | "assignment" | "allowance" | "edit";

const CARDS: {
  key: ModalKey;
  title: string;
  desc: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
}[] = [
  {
    key: "transfer",
    title: "نقل حارس",
    desc: "نقل حارس من مدرسته الحالية إلى مدرسة أخرى وتحديث سجله",
    icon: <ArrowLeftRight className="w-7 h-7" />,
    bg: "from-indigo-50 to-white border-indigo-100",
    iconBg: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "addGuard",
    title: "إضافة حارس جديد",
    desc: "تسجيل حارس أو حارسة جديد في المنظومة وربطه بمدرسة",
    icon: <UserPlus className="w-7 h-7" />,
    bg: "from-green-50 to-white border-green-100",
    iconBg: "bg-green-100 text-green-700",
  },
  {
    key: "assignment",
    title: "تكليف حارس",
    desc: "تكليف حارس مؤقتاً في جهة معينة مع تحديد مدة التكليف",
    icon: <Briefcase className="w-7 h-7" />,
    bg: "from-amber-50 to-white border-amber-100",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    key: "allowance",
    title: "إضافة بدل لحارس",
    desc: "تسجيل حالة البدل لحارس وتحديث إجراءاته",
    icon: <Wallet className="w-7 h-7" />,
    bg: "from-teal-50 to-white border-teal-100",
    iconBg: "bg-teal-100 text-teal-700",
  },
  {
    key: "edit",
    title: "تعديل بيانات حارس",
    desc: "تعديل البيانات الأساسية لحارس موجود وحفظ التغييرات",
    icon: <Pencil className="w-7 h-7" />,
    bg: "from-purple-50 to-white border-purple-100",
    iconBg: "bg-purple-100 text-purple-700",
  },
];

// ─── helpers for report export ────────────────────────────────────────────────

function buildReportHTML(ops: Operation[], filterLabel: string): string {
  const rows = ops.map((op) => `
    <tr>
      <td>${op.type}</td>
      <td>${op.guardName}</td>
      <td>${opSummary(op)}</td>
      <td>${op.performedBy || "—"}</td>
      <td>${op.date}</td>
      <td>${op.notes || "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير سجل العمليات</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 1.5cm; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11.5px; color: #1a1a1a; direction: rtl; }
    .header { text-align: center; border-bottom: 3px double #1a7a6e; padding-bottom: 12px; margin-bottom: 14px; }
    .header .kingdom { font-size: 11px; color: #666; }
    .header h1 { font-size: 15px; color: #1a7a6e; font-weight: 900; margin: 4px 0 2px; }
    .header .meta { font-size: 10.5px; color: #888; }
    .filter-bar { background: #f4faf9; border: 1px solid #c8e6e0; border-radius: 6px; padding: 7px 14px; margin-bottom: 12px; font-size: 11px; color: #444; }
    .stats-row { display: flex; gap: 14px; margin-bottom: 12px; }
    .stat { background: #f4faf9; border: 1px solid #c8e6e0; border-radius: 6px; padding: 5px 14px; font-size: 11px; }
    .stat strong { color: #1a7a6e; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a7a6e; color: #fff; padding: 7px 10px; text-align: right; font-size: 11px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 18px; border-top: 1px solid #e0e0e0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <p class="kingdom">المملكة العربية السعودية — وزارة التعليم</p>
    <h1>تقرير سجل العمليات — إدارة الأمن والسلامة — تعليم عسير</h1>
    <p class="meta">تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
  ${filterLabel ? `<div class="filter-bar">الفلاتر المطبقة: ${filterLabel}</div>` : ""}
  <div class="stats-row">
    <div class="stat">إجمالي العمليات: <strong>${ops.length}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>نوع العملية</th>
        <th>اسم الحارس</th>
        <th>التفاصيل</th>
        <th>تم بواسطة</th>
        <th>تاريخ العملية</th>
        <th>ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">لا توجد عمليات</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span>نظام إدارة الحراسات المدرسية — تعليم عسير</span>
    <span>عدد السجلات: ${ops.length}</span>
  </div>
</body>
</html>`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Operations() {
  const { guards, schools, operations } = useStore();
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

  // ── filter state ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fType, setFType]         = useState("");
  const [fEmployee, setFEmployee] = useState("");
  const [fGuard, setFGuard]       = useState("");
  const [fSchool, setFSchool]     = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo]     = useState("");

  const activeFilterCount = [fType, fEmployee, fGuard, fSchool, fDateFrom, fDateTo].filter(Boolean).length;

  function clearFilters() {
    setFType(""); setFEmployee(""); setFGuard(""); setFSchool("");
    setFDateFrom(""); setFDateTo("");
  }

  // ── dropdown options (dynamic from data) ──
  const uniqueEmployees = useMemo(() => {
    const s = new Set<string>();
    operations.forEach((op) => { if (op.performedBy) s.add(op.performedBy); });
    return Array.from(s).sort();
  }, [operations]);

  const uniqueGuards = useMemo(() => {
    const s = new Set<string>();
    operations.forEach((op) => { if (op.guardName) s.add(op.guardName); });
    return Array.from(s).sort();
  }, [operations]);

  // ── filtered result ──
  const filtered = useMemo(() => {
    return operations.filter((op) => {
      if (fType && op.type !== fType) return false;
      if (fEmployee && op.performedBy !== fEmployee) return false;
      if (fGuard && op.guardName !== fGuard) return false;
      if (fSchool) {
        const school =
          op.details.toSchoolName || op.details.schoolName || op.details.entity || "";
        if (!school.includes(fSchool)) return false;
      }
      if (fDateFrom && op.date < fDateFrom) return false;
      if (fDateTo   && op.date > fDateTo)   return false;
      return true;
    });
  }, [operations, fType, fEmployee, fGuard, fSchool, fDateFrom, fDateTo]);

  // ── export helpers ──
  function filterLabel() {
    return [
      fType     && `نوع العملية: ${fType}`,
      fEmployee && `الموظف: ${fEmployee}`,
      fGuard    && `الحارس: ${fGuard}`,
      fSchool   && `المدرسة: ${fSchool}`,
      fDateFrom && `من: ${fDateFrom}`,
      fDateTo   && `إلى: ${fDateTo}`,
    ].filter(Boolean).join(" | ");
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=1150,height=780");
    if (!win) return;
    win.document.write(buildReportHTML(filtered, filterLabel()));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  function handlePDF() {
    const win = window.open("", "_blank", "width=1150,height=780");
    if (!win) return;
    win.document.write(buildReportHTML(filtered, filterLabel()));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  function handleExcel() {
    import("xlsx").then((XLSX) => {
      const rows = filtered.map((op) => ({
        "نوع العملية":  op.type,
        "اسم الحارس":  op.guardName,
        "التفاصيل":    opSummary(op),
        "تم بواسطة":   op.performedBy || "—",
        "تاريخ العملية": op.date,
        "ملاحظات":     op.notes || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "سجل العمليات");
      XLSX.writeFile(wb, `operations-${todayStr()}.xlsx`);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h2 className="text-xl font-bold text-foreground">إدارة العمليات</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          المركز الموحد لجميع عمليات الحراس المدرسيين
        </p>
      </div>

      {/* ── Operation cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => setActiveModal(card.key)}
            className={`text-right p-5 rounded-2xl border bg-gradient-to-br ${card.bg} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${card.iconBg} group-hover:scale-105 transition-transform`}>
              {card.icon}
            </div>
            <h3 className="font-bold text-foreground text-base mb-1">{card.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Operations log ── */}
      <div>

        {/* Log title bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Title */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">سجل العمليات</h3>
              <p className="text-muted-foreground text-xs">
                {filtered.length} عملية
                {activeFilterCount > 0 ? ` (مفلترة من ${operations.length})` : " مسجلة"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all
                ${filtersOpen || activeFilterCount > 0
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white border-border text-foreground hover:bg-muted/60"}`}
            >
              <Filter className="w-4 h-4" />
              فلترة
              {activeFilterCount > 0 && (
                <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Export — only when data exists */}
            {operations.length > 0 && (
              <>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-white text-foreground hover:bg-muted/60 transition-colors">
                  <Printer className="w-4 h-4" />
                  طباعة العمليات
                </button>
                <button onClick={handleExcel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  تصدير Excel
                </button>
                <button onClick={handlePDF}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                  <FileDown className="w-4 h-4" />
                  تصدير PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Filters panel ── */}
        {filtersOpen && (
          <div className="bg-muted/30 border border-border rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

              {/* نوع العملية */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">نوع العملية</label>
                <div className="relative">
                  <select value={fType} onChange={(e) => setFType(e.target.value)}
                    className="w-full appearance-none px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">الكل</option>
                    {ALL_OP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* الموظف المنفذ */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الموظف المنفذ</label>
                <div className="relative">
                  <select value={fEmployee} onChange={(e) => setFEmployee(e.target.value)}
                    className="w-full appearance-none px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">الكل</option>
                    {uniqueEmployees.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* الحارس */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الحارس</label>
                <div className="relative">
                  <select value={fGuard} onChange={(e) => setFGuard(e.target.value)}
                    className="w-full appearance-none px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">الكل</option>
                    {uniqueGuards.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* المدرسة */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">المدرسة / الجهة</label>
                <input type="text" value={fSchool} onChange={(e) => setFSchool(e.target.value)}
                  placeholder="اكتب للبحث..."
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* التاريخ من */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">التاريخ من</label>
                <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* التاريخ إلى */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">التاريخ إلى</label>
                <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Filter summary + clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  يعرض{" "}
                  <span className="font-bold text-foreground">{filtered.length}</span>
                  {" "}من أصل{" "}
                  <span className="font-bold text-foreground">{operations.length}</span>
                  {" "}عملية
                </p>
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold transition-colors">
                  <X className="w-3.5 h-3.5" />
                  مسح الفلاتر
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {operations.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Settings2 className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">لا توجد عمليات مسجلة بعد</p>
              <p className="text-muted-foreground text-sm mt-1">اختر عملية من البطاقات أعلاه للبدء</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground font-medium">لا توجد نتائج تطابق الفلاتر المحددة</p>
              <button onClick={clearFilters}
                className="mt-2 text-sm text-primary hover:underline font-medium">
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>نوع العملية</th>
                    <th>اسم الحارس</th>
                    <th>التفاصيل</th>
                    <th>تم بواسطة</th>
                    <th>تاريخ العملية</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <span className={`badge flex items-center gap-1.5 w-fit ${OP_COLORS[op.type] ?? "bg-gray-100 text-gray-700"}`}>
                          {OP_ICON[op.type]}
                          {op.type}
                        </span>
                      </td>
                      <td className="font-medium text-foreground">{op.guardName}</td>
                      <td>
                        <p className="text-sm text-foreground max-w-56 line-clamp-2">{opSummary(op)}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <User2 className="w-3.5 h-3.5 flex-shrink-0 text-primary/50" />
                          <span className="font-medium text-foreground">{op.performedBy || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          {formatDate(op.date)}
                        </div>
                      </td>
                      <td>
                        <p className="text-sm text-muted-foreground max-w-40 line-clamp-1">
                          {op.notes || "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {activeModal === "transfer" && (
        <TransferModal guards={guards} schools={schools} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "addGuard" && (
        <AddGuardModal schools={schools} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "assignment" && (
        <AssignmentModal guards={guards} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "allowance" && (
        <AllowanceModal guards={guards} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "edit" && (
        <EditGuardModal guards={guards} schools={schools} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

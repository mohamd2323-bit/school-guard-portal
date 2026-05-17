import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
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
  details: Record<string, string>
): Operation {
  return { id: genId(), type, guardId, guardName, date, notes, createdAt: new Date().toISOString(), details };
}

// ─── OP meta ─────────────────────────────────────────────────────────────────

const OP_COLORS: Record<OperationType, string> = {
  "نقل حارس": "bg-indigo-100 text-indigo-800",
  "إضافة حارس": "bg-green-100 text-green-800",
  "تكليف حارس": "bg-amber-100 text-amber-800",
  "بدل حارس": "bg-teal-100 text-teal-800",
  "تعديل بيانات": "bg-purple-100 text-purple-800",
};

function opSummary(op: Operation): string {
  const d = op.details;
  switch (op.type) {
    case "نقل حارس":
      return `من "${d.fromSchoolName || "—"}" إلى "${d.toSchoolName || "—"}"`;
    case "إضافة حارس":
      return `مدرسة: ${d.schoolName || "—"} — محافظة: ${d.governorate || "—"}`;
    case "تكليف حارس":
      return `${d.entity || "—"} (${d.startDate || ""}–${d.endDate || ""})`;
    case "بدل حارس":
      return `حالة البدل: ${d.allowanceStatus || "—"}`;
    case "تعديل بيانات":
      return d.summary || "تعديل البيانات الأساسية";
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
    });
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
    });
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

function AssignmentModal({ guards, onClose }: { guards: Guard[]; onClose: () => void }) {
  const { addOperation } = useStore();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [entity, setEntity] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    if (!entity.trim()) { setError("يرجى إدخال جهة التكليف"); return; }
    if (!startDate) { setError("يرجى تحديد تاريخ البداية"); return; }
    setError("");

    const op = makeOp("تكليف حارس", guard.id, guard.name, startDate, notes, {
      entity: entity.trim(),
      startDate,
      endDate,
      reason: reason.trim(),
    });
    addOperation(op);
    onClose();
  }

  return (
    <Modal title="تكليف حارس من مدرسة إلى أخرى" icon={<Briefcase className="w-5 h-5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
        </div>

        {guard && (
          <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">مدرسته الحالية: </span>
            <span className="font-medium">{guard.schoolName || "بدون مدرسة"}</span>
          </div>
        )}

        <div>
          <FieldLabel required>جهة التكليف</FieldLabel>
          <input type="text" value={entity} onChange={(e) => setEntity(e.target.value)}
            placeholder="اسم الجهة التي يُكلَّف إليها الحارس"
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel required>تاريخ البداية</FieldLabel>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <FieldLabel>تاريخ النهاية</FieldLabel>
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
        <SubmitRow onClose={onClose} label="تسجيل التكليف" />
      </form>
    </Modal>
  );
}

// ─── 4. Allowance modal ───────────────────────────────────────────────────────

const ALLOWANCE_STATUSES = ["ممنوح", "موقوف", "مستحق", "تحت الإجراء", "مرفوض"];

function AllowanceModal({ guards, onClose }: { guards: Guard[]; onClose: () => void }) {
  const { addOperation } = useStore();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState(ALLOWANCE_STATUSES[0]);
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    setError("");

    const op = makeOp("بدل حارس", guard.id, guard.name, date, notes, { allowanceStatus });
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
    });
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Operations() {
  const { guards, schools, operations } = useStore();
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

  const recentOps = operations.slice(0, 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">إدارة العمليات</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          المركز الموحد لجميع عمليات الحراس المدرسيين
        </p>
      </div>

      {/* Operation cards */}
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

      {/* Recent operations */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">العمليات الأخيرة</h3>
            <p className="text-muted-foreground text-xs">آخر {Math.min(recentOps.length, 30)} عملية مسجلة</p>
          </div>
          {operations.length > 0 && (
            <span className="mr-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              الإجمالي: {operations.length}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {operations.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Settings2 className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">لا توجد عمليات مسجلة بعد</p>
              <p className="text-muted-foreground text-sm mt-1">اختر عملية من البطاقات أعلاه للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>نوع العملية</th>
                    <th>اسم الحارس</th>
                    <th>التفاصيل</th>
                    <th>تاريخ العملية</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOps.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <span className={`badge flex items-center gap-1.5 w-fit ${OP_COLORS[op.type]}`}>
                          {op.type === "نقل حارس" && <ArrowLeftRight className="w-3 h-3" />}
                          {op.type === "إضافة حارس" && <UserPlus className="w-3 h-3" />}
                          {op.type === "تكليف حارس" && <Briefcase className="w-3 h-3" />}
                          {op.type === "بدل حارس" && <Wallet className="w-3 h-3" />}
                          {op.type === "تعديل بيانات" && <Pencil className="w-3 h-3" />}
                          {op.type}
                        </span>
                      </td>
                      <td className="font-medium text-foreground">{op.guardName}</td>
                      <td>
                        <p className="text-sm text-foreground max-w-56 line-clamp-2">{opSummary(op)}</p>
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

      {/* Modals */}
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

import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import {
  Search, School as SchoolIcon, FolderOpen, AlertTriangle,
  UserPlus, Briefcase, ClipboardList, X, Shield,
  Plus, Pencil, Trash2, Lock, Eye, EyeOff,
} from "lucide-react";
import SchoolProfile from "../components/SchoolProfile";
import type { School, Guard, Need, NeedType, Operation } from "../types";

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function makeOp(
  type: Operation["type"],
  guardId: string | null,
  guardName: string,
  date: string,
  notes: string,
  details: Record<string, string>
): Operation {
  return { id: genId(), type, guardId, guardName, date, notes, createdAt: new Date().toISOString(), details };
}

// ─── Filter type ─────────────────────────────────────────────────────────────

type GuardFilter = "all" | "no-guard" | "has-guard";

// ─── Guard picker (inline) ────────────────────────────────────────────────────

function GuardPicker({
  guards, selected, onSelect, placeholder,
}: {
  guards: Guard[]; selected: Guard | null; onSelect: (g: Guard | null) => void; placeholder?: string;
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
    return guards.filter((g) => g.name.includes(q) || g.nationalId.includes(q)).slice(0, 12);
  }, [query, guards]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          placeholder={placeholder ?? "ابحث باسم الحارس أو السجل المدني..."}
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
                {g.nationalId} — {g.schoolName || "بدون مدرسة"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared modal shell ───────────────────────────────────────────────────────

function ModalShell({ title, subtitle, icon, onClose, children }: {
  title: string; subtitle?: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              {icon}
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">{title}</h2>
              {subtitle && <p className="text-white/70 text-xs">{subtitle}</p>}
            </div>
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

function SchoolInfoBox({ school }: { school: School }) {
  return (
    <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
      <SchoolIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold text-foreground">{school.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{school.governorate} — {school.level} — {school.type}</p>
      </div>
    </div>
  );
}

// ─── 1. تعيين حارس modal ─────────────────────────────────────────────────────

function AssignGuardModal({ school, guards, onClose }: {
  school: School; guards: Guard[]; onClose: () => void;
}) {
  const { updateGuard } = useStore();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [error, setError] = useState("");

  const unassignedFirst = useMemo(() => {
    const unassigned = guards.filter((g) => !g.schoolId || g.schoolId === "");
    const assigned = guards.filter((g) => g.schoolId && g.schoolId !== "");
    return [...unassigned, ...assigned];
  }, [guards]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    setError("");
    const op = makeOp("نقل حارس", guard.id, guard.name, todayStr(), "", {
      fromSchoolName: guard.schoolName || "بدون مدرسة",
      fromSchoolId: guard.schoolId || "",
      toSchoolName: school.name,
      toSchoolId: school.id,
      reason: "تعيين مباشر من إدارة المدارس",
    });
    updateGuard(guard.id, {
      schoolId: school.id,
      schoolName: school.name,
      governorate: school.governorate,
    }, op);
    onClose();
  }

  return (
    <ModalShell title="تعيين حارس للمدرسة" subtitle={school.name} icon={<UserPlus className="w-4.5 h-4.5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SchoolInfoBox school={school} />
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={unassignedFirst} selected={guard} onSelect={setGuard} />
          {guards.filter((g) => !g.schoolId).length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              الحراس غير المعيّنون يظهرون أولاً ({guards.filter((g) => !g.schoolId).length} حارس)
            </p>
          )}
        </div>
        {guard && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${guard.schoolId ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <p className="font-medium text-foreground">{guard.name}</p>
            <p className="text-xs mt-0.5">
              {guard.schoolId
                ? <span className="text-amber-700">سيُنقل من: {guard.schoolName}</span>
                : <span className="text-green-700">حارس غير مُعيَّن — سيُضاف للمدرسة مباشرة</span>
              }
            </p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            تأكيد التعيين
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── 2. تكليف مؤقت modal ─────────────────────────────────────────────────────

function TempAssignModal({ school, guards, onClose }: {
  school: School; guards: Guard[]; onClose: () => void;
}) {
  const { addOperation } = useStore();
  const [guard, setGuard] = useState<Guard | null>(null);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guard) { setError("يرجى اختيار الحارس"); return; }
    if (!startDate) { setError("يرجى تحديد تاريخ البداية"); return; }
    setError("");
    const op = makeOp("تكليف حارس", guard.id, guard.name, startDate, notes, {
      entity: school.name,
      entityType: "مدرسة",
      startDate,
      endDate,
      reason: reason.trim() || "تكليف مؤقت لتغطية احتياج المدرسة",
    });
    addOperation(op);
    onClose();
  }

  return (
    <ModalShell title="تكليف مؤقت للمدرسة" subtitle={school.name} icon={<Briefcase className="w-4.5 h-4.5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SchoolInfoBox school={school} />
        <div>
          <FieldLabel required>اختيار الحارس</FieldLabel>
          <GuardPicker guards={guards} selected={guard} onSelect={setGuard} />
        </div>
        {guard && (
          <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">جهة عمله الحالية: </span>
            <span className="font-medium">{guard.schoolName || "بدون مدرسة"}</span>
          </div>
        )}
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
            placeholder="اكتب سبب التكليف المؤقت..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <div>
          <FieldLabel>ملاحظات</FieldLabel>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            تسجيل التكليف
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── 3. إضافة احتياج modal ───────────────────────────────────────────────────

const NEED_TYPES: NeedType[] = ["حارس", "حارسة"];

function AddNeedModal({ school, onClose }: { school: School; onClose: () => void }) {
  const { addNeed } = useStore();
  const [needType, setNeedType] = useState<NeedType>("حارس");
  const [reason, setReason] = useState("");
  const [requestDate, setRequestDate] = useState(todayStr());
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("يرجى كتابة سبب الاحتياج"); return; }
    setError("");
    const need: Need = {
      id: genId(),
      schoolId: school.id,
      schoolName: school.name,
      governorate: school.governorate,
      principalName: school.principalName,
      principalNationalId: school.principalNationalId,
      principalPhone: school.principalPhone,
      needType,
      reason: reason.trim(),
      requestDate,
      status: "جديد",
      createdAt: new Date().toISOString(),
    };
    addNeed(need);
    onClose();
  }

  return (
    <ModalShell title="إضافة احتياج للمدرسة" subtitle={school.name} icon={<ClipboardList className="w-4.5 h-4.5" />} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SchoolInfoBox school={school} />
        <div>
          <FieldLabel required>نوع الاحتياج</FieldLabel>
          <div className="flex gap-3">
            {NEED_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setNeedType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                  ${needType === t ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                {t === "حارس" ? "👮 حارس" : "👩 حارسة"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel required>سبب الاحتياج</FieldLabel>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="اشرح سبب الاحتياج لحارس جديد..."
            className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <div>
          <FieldLabel required>تاريخ الطلب</FieldLabel>
          <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            تسجيل الاحتياج
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── 4. إضافة / تعديل مدرسة modal ───────────────────────────────────────────

const SCHOOL_TYPES: School["type"][] = ["بنين", "بنات", "مختلط"];

function SchoolFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: School;
  onSave: (data: Omit<School, "id" | "isDemo">) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [governorate, setGovernorate] = useState(initial?.governorate ?? "");
  const [level, setLevel] = useState(initial?.level ?? "");
  const [type, setType] = useState<School["type"]>(initial?.type ?? "بنين");
  const [principalName, setPrincipalName] = useState(initial?.principalName ?? "");
  const [principalNationalId, setPrincipalNationalId] = useState(initial?.principalNationalId ?? "");
  const [principalPhone, setPrincipalPhone] = useState(initial?.principalPhone ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("اسم المدرسة مطلوب"); return; }
    setError("");
    onSave({ name: name.trim(), governorate: governorate.trim(), level: level.trim(), type, principalName: principalName.trim(), principalNationalId: principalNationalId.trim(), principalPhone: principalPhone.trim() });
  }

  const inputCls = "w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";

  return (
    <ModalShell
      title={isEdit ? "تعديل بيانات المدرسة" : "إضافة مدرسة جديدة"}
      subtitle={isEdit ? initial?.name : undefined}
      icon={<SchoolIcon className="w-4.5 h-4.5" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* School fields */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">بيانات المدرسة</p>
          <div>
            <FieldLabel required>اسم المدرسة</FieldLabel>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم المدرسة" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>المحافظة</FieldLabel>
              <input type="text" value={governorate} onChange={(e) => setGovernorate(e.target.value)}
                placeholder="المحافظة" className={inputCls} />
            </div>
            <div>
              <FieldLabel>المرحلة</FieldLabel>
              <input type="text" value={level} onChange={(e) => setLevel(e.target.value)}
                placeholder="ابتدائي / متوسط / ثانوي" className={inputCls} />
            </div>
          </div>
          <div>
            <FieldLabel>النوع</FieldLabel>
            <div className="flex gap-2">
              {SCHOOL_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${type === t ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Principal fields */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">بيانات المدير/ة</p>
          <div>
            <FieldLabel>اسم المدير/ة</FieldLabel>
            <input type="text" value={principalName} onChange={(e) => setPrincipalName(e.target.value)}
              placeholder="اسم المدير أو المديرة" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>سجل المدير/ة</FieldLabel>
              <input type="text" value={principalNationalId} onChange={(e) => setPrincipalNationalId(e.target.value)}
                placeholder="رقم الهوية الوطنية" className={inputCls} />
            </div>
            <div>
              <FieldLabel>جوال المدير/ة</FieldLabel>
              <input type="text" value={principalPhone} onChange={(e) => setPrincipalPhone(e.target.value)}
                placeholder="05xxxxxxxx" className={inputCls} dir="ltr" />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="submit"
            className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            {isEdit ? "حفظ التعديلات" : "إضافة المدرسة"}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Action menu for no-guard schools ────────────────────────────────────────

type ActionModal = { type: "assign" | "temp" | "need"; school: School };

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Schools() {
  const { schools, guards, addSchool, updateSchool, deleteSchool } = useStore();
  const { currentUser, isAdmin } = useUsers();
  const [search, setSearch] = useState("");
  const [guardFilter, setGuardFilter] = useState<GuardFilter>("all");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [formModal, setFormModal] = useState<{ mode: "add" } | { mode: "edit"; school: School } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [unauthorizedMsg, setUnauthorizedMsg] = useState<string | null>(null);

  const guardCountMap = useMemo(() => {
    const map = new Map<string, number>();
    guards.forEach((g) => {
      if (g.schoolId) map.set(g.schoolId, (map.get(g.schoolId) ?? 0) + 1);
    });
    return map;
  }, [guards]);

  const noGuardCount = useMemo(() =>
    schools.filter((s) => !guardCountMap.has(s.id)).length,
    [schools, guardCountMap]
  );

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const hasGuard = guardCountMap.has(s.id);
      const matchesFilter =
        guardFilter === "all" ||
        (guardFilter === "no-guard" && !hasGuard) ||
        (guardFilter === "has-guard" && hasGuard);
      const q = search.trim();
      const matchesSearch = !q ||
        s.name.includes(q) ||
        s.governorate.includes(q) ||
        s.level.includes(q) ||
        s.principalName.includes(q) ||
        s.principalNationalId.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [schools, guardCountMap, guardFilter, search]);

  const FILTER_TABS: { key: GuardFilter; label: string }[] = [
    { key: "all", label: `جميع المدارس (${schools.length})` },
    { key: "no-guard", label: `بدون حارس (${noGuardCount})` },
    { key: "has-guard", label: `مرتبطة بحارس (${schools.length - noGuardCount})` },
  ];

  function handleSaveSchool(data: Omit<School, "id" | "isDemo">) {
    if (formModal?.mode === "edit") {
      updateSchool(formModal.school.id, data);
    } else {
      addSchool({ ...data, id: Math.random().toString(36).slice(2) + Date.now().toString(36) });
    }
    setFormModal(null);
  }

  function openDeleteDialog(school: School) {
    if (!isAdmin) {
      setUnauthorizedMsg("غير مصرح لك بحذف المدارس");
      setTimeout(() => setUnauthorizedMsg(null), 3000);
      return;
    }
    setDeleteTarget(school);
    setDeletePassword("");
    setDeletePasswordError("");
    setShowDeletePassword(false);
  }

  function handleDelete() {
    if (!deleteTarget || !currentUser) return;
    if (deletePassword !== currentUser.password) {
      setDeletePasswordError("كلمة المرور غير صحيحة");
      return;
    }
    deleteSchool(deleteTarget.id, {
      username: currentUser.username,
      schoolName: deleteTarget.name,
    });
    setDeleteTarget(null);
    setDeletePassword("");
    setDeletePasswordError("");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة المدارس</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            إجمالي: {schools.length.toLocaleString("ar-SA")} مدرسة
            {noGuardCount > 0 && (
              <span className="mr-2 text-orange-600 font-semibold">
                — {noGuardCount.toLocaleString("ar-SA")} بدون حارس
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setFormModal({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            إضافة مدرسة
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {schools.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إجمالي المدارس", value: schools.length, color: "bg-white border-border text-foreground" },
            { label: "مدارس بدون حارس", value: noGuardCount, color: noGuardCount > 0 ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-green-50 border-green-200 text-green-800" },
            { label: "مدارس مرتبطة بحارس", value: schools.length - noGuardCount, color: "bg-teal-50 border-teal-200 text-teal-800" },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{s.value.toLocaleString("ar-SA")}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {schools.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setGuardFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                ${guardFilter === tab.key
                  ? tab.key === "no-guard"
                    ? "border-orange-400 bg-orange-50 text-orange-800"
                    : "border-primary bg-primary text-white"
                  : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
            >
              {tab.key === "no-guard" && guardFilter === tab.key && (
                <AlertTriangle className="w-3.5 h-3.5 inline ml-1.5 -mt-0.5" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {schools.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <SchoolIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">لا توجد بيانات حالياً</p>
            <p className="text-muted-foreground text-sm mt-1">
              يمكنك{" "}
              <button onClick={() => setFormModal({ mode: "add" })} className="text-primary hover:underline">إضافة مدرسة يدوياً</button>
              {" "}أو استيراد بيانات من{" "}
              <a href="/data" className="text-primary hover:underline">إدارة البيانات</a>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم المدرسة</th>
                  <th>المحافظة</th>
                  <th>المرحلة</th>
                  <th>النوع</th>
                  <th>اسم المدير/ة</th>
                  <th>سجل المدير/ة</th>
                  <th>جوال المدير/ة</th>
                  <th>عدد الحراس</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school) => {
                  const count = guardCountMap.get(school.id) ?? 0;
                  const noGuard = count === 0;
                  return (
                    <tr
                      key={school.id}
                      className={noGuard ? "bg-orange-50/60 hover:bg-orange-50" : undefined}
                    >
                      {/* School name */}
                      <td>
                        <p className={`font-semibold ${noGuard ? "text-orange-900" : "text-foreground"}`}>
                          {school.name}
                        </p>
                      </td>
                      <td>{school.governorate}</td>
                      <td>{school.level}</td>
                      <td>
                        <span className={`badge ${
                          school.type === "بنين" ? "badge-male"
                          : school.type === "بنات" ? "badge-female"
                          : "bg-purple-100 text-purple-800"
                        }`}>
                          {school.type}
                        </span>
                      </td>
                      <td>{school.principalName}</td>
                      <td className="font-mono text-sm">{school.principalNationalId}</td>
                      <td dir="ltr" className="text-right font-mono text-sm">{school.principalPhone}</td>

                      {/* Guard count */}
                      <td>
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                            ${count > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-orange-100 text-orange-700"
                            }`}>
                            <Shield className="w-3 h-3" />
                            {count}
                          </span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td>
                        {noGuard ? (
                          <span className="badge bg-orange-100 text-orange-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            بدون حارس
                          </span>
                        ) : (
                          <span className="badge bg-green-100 text-green-800">مرتبطة</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* ملف */}
                          <button
                            onClick={() => setSelectedSchool(school)}
                            title="عرض ملف المدرسة"
                            className="flex items-center gap-1 text-xs bg-muted text-muted-foreground hover:bg-muted/80 px-2 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            ملف
                          </button>

                          {/* تعديل */}
                          <button
                            onClick={() => setFormModal({ mode: "edit", school })}
                            title="تعديل بيانات المدرسة"
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1.5 rounded-lg transition-colors font-semibold"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            تعديل
                          </button>

                          {/* حذف — مدير النظام فقط */}
                          {isAdmin ? (
                            <button
                              onClick={() => openDeleteDialog(school)}
                              title="حذف المدرسة"
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-2 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          ) : (
                            <button
                              onClick={() => openDeleteDialog(school)}
                              title="غير مصرح لك بحذف المدارس"
                              className="flex items-center gap-1 text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-1.5 rounded-lg cursor-not-allowed font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          )}

                          {/* No-guard quick actions */}
                          {noGuard && (
                            <>
                              <button
                                onClick={() => setActionModal({ type: "assign", school })}
                                title="تعيين حارس"
                                className="flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                تعيين
                              </button>
                              <button
                                onClick={() => setActionModal({ type: "temp", school })}
                                title="تكليف مؤقت"
                                className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                مؤقت
                              </button>
                              <button
                                onClick={() => setActionModal({ type: "need", school })}
                                title="إضافة احتياج"
                                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                                احتياج
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* School profile modal */}
      {selectedSchool && (
        <SchoolProfile school={selectedSchool} guards={guards} onClose={() => setSelectedSchool(null)} />
      )}

      {/* Add / Edit school modal */}
      {formModal && (
        <SchoolFormModal
          initial={formModal.mode === "edit" ? formModal.school : undefined}
          onSave={handleSaveSchool}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Unauthorized toast */}
      {unauthorizedMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2" dir="rtl">
          <Shield className="w-4 h-4 flex-shrink-0" />
          {unauthorizedMsg}
        </div>
      )}

      {/* Delete confirmation — admin + password required */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">حذف المدرسة</h3>
                <p className="text-muted-foreground text-xs mt-0.5">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            {/* School name */}
            <p className="text-sm text-foreground">
              هل أنت متأكد من حذف مدرسة{" "}
              <span className="font-bold text-red-700">«{deleteTarget.name}»</span>؟
            </p>

            {/* Guards warning */}
            {(guardCountMap.get(deleteTarget.id) ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <p className="text-amber-800 font-semibold">
                  تنبيه: {guardCountMap.get(deleteTarget.id)} حارس مرتبط بهذه المدرسة
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  لن يُحذف الحراس — سيُفكّ ارتباطهم بالمدرسة فقط.
                </p>
              </div>
            )}

            {/* Password confirmation */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                تأكيد هوية مدير النظام
              </div>

              {/* Username — read-only */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={currentUser?.username ?? ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(""); }}
                    placeholder="أدخل كلمة المرور"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${deletePasswordError ? "border-red-400 bg-red-50" : "border-border"}`}
                    onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deletePasswordError && (
                  <p className="text-red-600 text-xs mt-1 font-semibold">{deletePasswordError}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={!deletePassword}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeletePassword(""); setDeletePasswordError(""); }}
                className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick action modals */}
      {actionModal?.type === "assign" && (
        <AssignGuardModal
          school={actionModal.school}
          guards={guards}
          onClose={() => setActionModal(null)}
        />
      )}
      {actionModal?.type === "temp" && (
        <TempAssignModal
          school={actionModal.school}
          guards={guards}
          onClose={() => setActionModal(null)}
        />
      )}
      {actionModal?.type === "need" && (
        <AddNeedModal
          school={actionModal.school}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

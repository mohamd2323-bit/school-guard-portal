import { useState, useMemo, useRef, useEffect } from "react";
import { refreshStore, useStore } from "../store/useStore";
import { exportTicketsWorkbook } from "../lib/ticketsExcelExport";
import { importTicketsFromExcel } from "../lib/ticketsExcelImport";
import type { Ticket, TicketPriority, TicketStatus, TicketType, School } from "../types";
import {
  Plus,
  Download,
  Upload,
  RefreshCw,
  Search,
  Headphones,
  X,
  ChevronDown,
  Trash2,
  Sparkles,
  Calendar,
  Eye,
  Building2,
  UserCheck,
  Hash,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTicketNumber() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BLG-${num}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const TICKET_TYPES: TicketType[] = [
  "شكوى",
  "طلب صيانة",
  "طلب دعم فني",
  "بلاغ حادثة",
  "متابعة",
  "أخرى",
];

const STATUS_COLORS: Record<TicketStatus, string> = {
  "جديد": "bg-blue-100 text-blue-800",
  "تحت الإجراء": "bg-amber-100 text-amber-800",
  "مغلق": "bg-gray-100 text-gray-600",
};

const ALL_STATUSES: TicketStatus[] = ["جديد", "تحت الإجراء", "مغلق"];
const ALL_PRIORITIES: TicketPriority[] = ["منخفض", "متوسط", "عالي", "حرج"];

const TYPE_COLORS: Record<TicketType, string> = {
  "شكوى": "bg-red-50 text-red-700",
  "طلب صيانة": "bg-orange-50 text-orange-700",
  "طلب دعم فني": "bg-purple-50 text-purple-700",
  "بلاغ حادثة": "bg-rose-50 text-rose-800",
  "متابعة": "bg-teal-50 text-teal-700",
  "أخرى": "bg-gray-50 text-gray-600",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  "منخفض": "bg-slate-100 text-slate-700",
  "متوسط": "bg-sky-100 text-sky-800",
  "عالي": "bg-orange-100 text-orange-800",
  "حرج": "bg-red-100 text-red-800",
};

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyTicket(ticket: Ticket) {
  const text = `${ticket.problem ?? ""} ${ticket.ticketType} ${ticket.description} ${ticket.actions}`.toLowerCase();
  if (includesAny(text, ["دخول", "كلمة مرور", "حساب", "رمز", "تسجيل"])) return "حساب/دخول";
  if (includesAny(text, ["شبكة", "إنترنت", "انترنت", "اتصال", "واي فاي"])) return "شبكة/اتصال";
  if (includesAny(text, ["صلاحية", "مستخدم", "دور", "اعتماد"])) return "صلاحيات";
  if (includesAny(text, ["عطل", "لا يعمل", "خطأ", "تعليق", "النظام"])) return "نظام/تعطل";
  if (includesAny(text, ["جهاز", "طابعة", "ماسح", "حاسب"])) return "أجهزة";
  if (includesAny(text, ["بيانات", "تحديث", "استيراد", "مزامنة"])) return "بيانات";
  if (includesAny(text, ["حادثة", "أمن", "سلامة", "بوابة", "حراسة"])) return "أمن وسلامة";
  return "أخرى";
}

function inferPriority(ticket: Ticket): TicketPriority {
  if (ticket.priority) return ticket.priority;
  const text = `${ticket.problem ?? ""} ${ticket.ticketType} ${ticket.description}`.toLowerCase();
  if (ticket.ticketType === "بلاغ حادثة" || includesAny(text, ["حرج", "عاجل", "حادثة", "خطر"])) return "حرج";
  if (includesAny(text, ["تعطل", "لا يعمل", "انقطاع", "متوقف", "فشل"])) return "عالي";
  if (ticket.status === "مغلق") return "منخفض";
  return "متوسط";
}

function ticketAgeDays(ticket: Ticket) {
  const start = new Date(ticket.ticketDate);
  if (Number.isNaN(start.getTime())) return 0;
  const end = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date();
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

// ─── School picker ────────────────────────────────────────────────────────────

function SchoolPicker({
  schools,
  selected,
  onSelect,
}: {
  schools: School[];
  selected: School | null;
  onSelect: (s: School | null) => void;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const results = useMemo(() => {
    if (!query.trim()) return schools.slice(0, 10);
    const q = query.trim();
    return schools
      .filter((s) => s.name.includes(q) || s.principalName.includes(q) || s.principalNationalId.includes(q))
      .slice(0, 12);
  }, [query, schools]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث باسم المدرسة أو المدير/ة..."
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

// ─── Add modal ────────────────────────────────────────────────────────────────

function AddModal({ schools, onClose, onSave }: { schools: School[]; onClose: () => void; onSave: (t: Ticket) => void }) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [problem, setProblem] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("شكوى");
  const [priority, setPriority] = useState<TicketPriority>("متوسط");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState("");
  const [ticketDate, setTicketDate] = useState(todayStr());
  const [resolvedAt, setResolvedAt] = useState("");
  const [status, setStatus] = useState<TicketStatus>("جديد");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSchool) { setError("يرجى اختيار المدرسة أولاً"); return; }
    if (!description.trim()) { setError("يرجى كتابة وصف البلاغ"); return; }
    setError("");

    onSave({
      id: generateId(),
      ticketNumber: generateTicketNumber(),
      source: "البوابة",
      reporterName: reporterName.trim() || selectedSchool.principalName,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      governorate: selectedSchool.governorate,
      principalName: selectedSchool.principalName,
      principalPhone: selectedSchool.principalPhone,
      ticketType,
      problem: problem.trim() || ticketType,
      description: description.trim(),
      status,
      priority,
      ticketDate,
      resolvedAt: status === "مغلق" ? resolvedAt || todayStr() : "",
      actions: actions.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-base">إضافة بلاغ جديد</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* School */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">المحافظة</p>
                  <p className="font-medium">{selectedSchool.governorate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">المرحلة / النوع</p>
                  <p className="font-medium">{selectedSchool.level} — {selectedSchool.type}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2 flex items-start gap-2">
                <UserCheck className="w-3.5 h-3.5 text-primary mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="text-muted-foreground">المدير/ة: <span className="text-foreground font-medium">{selectedSchool.principalName}</span></p>
                  <p className="text-muted-foreground">الجوال: <span className="text-foreground font-medium">{selectedSchool.principalPhone}</span></p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">مقدم البلاغ</label>
              <input value={reporterName} onChange={(e) => setReporterName(e.target.value)}
                placeholder="يترك فارغاً لاستخدام اسم المدير/ة"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">المشكلة</label>
              <input value={problem} onChange={(e) => setProblem(e.target.value)}
                placeholder="مثال: تعذر الدخول للنظام"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                نوع البلاغ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={ticketType} onChange={(e) => setTicketType(e.target.value as TicketType)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  {TICKET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">الأولوية</label>
              <div className="relative">
                <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              وصف البلاغ <span className="text-red-500">*</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="اكتب وصفاً تفصيلياً للبلاغ..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">الإجراءات المتخذة</label>
            <textarea value={actions} onChange={(e) => setActions(e.target.value)}
              rows={2} placeholder="اذكر الإجراءات المتخذة إن وجدت (اختياري)..."
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">تاريخ البلاغ <span className="text-red-500">*</span></label>
              <input type="date" value={ticketDate} onChange={(e) => setTicketDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">حالة البلاغ</label>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}
                  className="w-full appearance-none px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {status === "مغلق" && (
            <div>
              <label className="block text-sm font-semibold mb-1.5">تاريخ المعالجة</label>
              <input type="date" value={resolvedAt} onChange={(e) => setResolvedAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
              حفظ البلاغ
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

function DetailsModal({ ticket, onClose, onUpdate, onDelete }: {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: (patch: Partial<Ticket>) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(inferPriority(ticket));
  const [resolvedAt, setResolvedAt] = useState(ticket.resolvedAt ?? "");
  const [actions, setActions] = useState(ticket.actions);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onUpdate({
      status,
      priority,
      resolvedAt: status === "مغلق" ? resolvedAt || todayStr() : "",
      actions,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function formatDate(d: string) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{ticket.ticketNumber}</p>
              <p className="text-white/70 text-xs">{ticket.ticketType}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ticket info */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">تفاصيل البلاغ</p>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="رقم البلاغ" value={ticket.ticketNumber} />
              <InfoRow label="مصدر البلاغ" value={ticket.source ?? "البوابة"} />
              <InfoRow label="الرقم الخارجي" value={ticket.externalId ?? ""} />
              <InfoRow label="مقدم البلاغ" value={ticket.reporterName || ticket.principalName} />
              <InfoRow label="المدرسة" value={ticket.schoolName} />
              <InfoRow label="المحافظة" value={ticket.governorate} />
              <InfoRow label="نوع البلاغ" value={ticket.ticketType} />
              <InfoRow label="المشكلة" value={ticket.problem || ticket.ticketType} />
              <InfoRow label="تاريخ البلاغ" value={formatDate(ticket.ticketDate)} />
              <InfoRow label="التصنيف المقترح" value={classifyTicket(ticket)} />
              <InfoRow label="مدة المتابعة" value={`${ticketAgeDays(ticket)} يوم`} />
            </div>
          </section>

          {/* Description */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">وصف البلاغ</p>
            <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed">
              {ticket.description}
            </div>
          </section>

          {/* Principal */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">بيانات المدير/ة</p>
            <div className="bg-muted/40 rounded-xl px-4 py-1">
              <InfoRow label="اسم المدير/ة" value={ticket.principalName} />
              <InfoRow label="رقم الجوال" value={ticket.principalPhone} />
            </div>
          </section>

          {/* Editable: status + actions */}
          <section className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">تحديث البلاغ</p>
            <div>
              <label className="block text-sm font-semibold mb-1.5">حالة البلاغ</label>
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
              <label className="block text-sm font-semibold mb-1.5">الأولوية</label>
              <div className="flex gap-2">
                {ALL_PRIORITIES.map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                      ${priority === p ? `border-transparent ${PRIORITY_COLORS[p]}` : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {status === "مغلق" && (
              <div>
                <label className="block text-sm font-semibold mb-1.5">تاريخ المعالجة</label>
                <input type="date" value={resolvedAt} onChange={(e) => setResolvedAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1.5">الإجراءات المتخذة</label>
              <textarea value={actions} onChange={(e) => setActions(e.target.value)}
                rows={3} placeholder="أدخل الإجراءات المتخذة..."
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors
                  ${saved ? "bg-green-600 text-white" : "bg-primary text-white hover:bg-primary/90"}`}>
                {saved ? "✓ تم الحفظ" : "حفظ التحديثات"}
              </button>
              <button onClick={() => { if (confirm("هل أنت متأكد من حذف هذا البلاغ؟")) { onDelete(); onClose(); } }}
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

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusBadge({ status, onChange }: { status: TicketStatus; onChange: (s: TicketStatus) => void }) {
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
            <button key={s} className="w-full text-right px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
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

export default function Tickets() {
  const { schools, tickets, addTicket, upsertTickets, removeInvalidImportedTickets, updateTicket, deleteTicket } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "الكل">("الكل");
  const [filterType, setFilterType] = useState<TicketType | "الكل">("الكل");
  const [filterPriority, setFilterPriority] = useState<TicketPriority | "الكل">("الكل");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    tickets.filter((t) => {
      const q = search.trim();
      const matchSearch = !q ||
        t.ticketNumber.includes(q) ||
        t.schoolName.includes(q) ||
        t.governorate.includes(q) ||
        t.description.includes(q) ||
        (t.problem ?? "").includes(q) ||
        (t.reporterName ?? "").includes(q) ||
        t.principalName.includes(q);
      return matchSearch &&
        (filterStatus === "الكل" || t.status === filterStatus) &&
        (filterType === "الكل" || t.ticketType === filterType) &&
        (filterPriority === "الكل" || inferPriority(t) === filterPriority);
    }),
    [tickets, search, filterStatus, filterType, filterPriority]
  );

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "مغلق");
    const critical = tickets.filter((t) => inferPriority(t) === "حرج");
    const synced = tickets.filter((t) => t.source === "منصة الدعم الموحد");

    return {
      total: tickets.length,
      new: tickets.filter((t) => t.status === "جديد").length,
      inProgress: tickets.filter((t) => t.status === "تحت الإجراء").length,
      closed: tickets.filter((t) => t.status === "مغلق").length,
      open: open.length,
      critical: critical.length,
      synced: synced.length,
      avgAge: open.length
        ? Math.round(open.reduce((sum, ticket) => sum + ticketAgeDays(ticket), 0) / open.length)
        : 0,
    };
  }, [tickets]);

  const leaders = useMemo(() => {
    const bySchool = new Map<string, number>();
    const byCategory = new Map<string, number>();
    tickets.forEach((ticket) => {
      bySchool.set(ticket.schoolName, (bySchool.get(ticket.schoolName) ?? 0) + 1);
      const category = classifyTicket(ticket);
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    });

    const topSchool = Array.from(bySchool.entries()).sort((a, b) => b[1] - a[1])[0];
    const topCategory = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      school: topSchool ? `${topSchool[0]} (${topSchool[1]})` : "لا يوجد",
      category: topCategory ? `${topCategory[0]} (${topCategory[1]})` : "لا يوجد",
    };
  }, [tickets]);

  const invalidImportedCount = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (ticket.source !== "منصة الدعم الموحد") return false;
        const randomImportNumber = /^BLG-[A-Z0-9]{6}$/i.test(ticket.ticketNumber);
        const invalidDate = ticket.ticketDate === "Invalid Date" || Number.isNaN(new Date(ticket.ticketDate).getTime());
        return randomImportNumber || (invalidDate && ticket.schoolName === "غير محدد");
      }).length,
    [tickets],
  );

  function formatDate(d: string) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  }

  const selectedFull = selected ? tickets.find((t) => t.id === selected.id) ?? selected : null;

  async function handleSync() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/unified-support/sync", { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMessage(typeof payload.error === "string" ? payload.error : "تعذر الاتصال بمنصة الدعم الموحد.");
        return;
      }
      refreshStore();
      setSyncMessage(`تمت المزامنة: ${payload.imported ?? 0} جديد، ${payload.updated ?? 0} محدث.`);
    } catch {
      setSyncMessage("تعذر تنفيذ المزامنة. تحقق من اتصال الخادم وإعدادات منصة الدعم الموحد.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    setSyncMessage("");
    try {
      const importedTickets = await importTicketsFromExcel(file, schools);
      if (importedTickets.length === 0) {
        setSyncMessage("لم يتم العثور على بلاغات قابلة للاستيراد في الملف.");
        return;
      }
      upsertTickets(importedTickets);
      setSyncMessage(`تم استيراد/تحديث ${importedTickets.length.toLocaleString("ar-SA")} بلاغ من ملف Excel.`);
    } catch {
      setSyncMessage("تعذر قراءة ملف Excel. تأكد أن الأعمدة تحتوي على رقم البلاغ، المدرسة، الحالة، والوصف.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">بلاغات الدعم الموحد</h2>
          <p className="text-muted-foreground text-sm mt-0.5">متابعة وإدارة بلاغات الدعم للمدارس</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {invalidImportedCount > 0 && (
            <button onClick={() => {
              removeInvalidImportedTickets();
              setSyncMessage(`تم تنظيف ${invalidImportedCount.toLocaleString("ar-SA")} بلاغ مستورد غير صالح.`);
            }}
              className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors shadow-sm">
              <Sparkles className="w-4 h-4" />
              تنظيف الوهمية
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
          />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white text-slate-800 border border-border px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-muted/60 transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            استيراد Excel
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-teal-50 text-teal-800 border border-teal-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-100 disabled:opacity-60 transition-colors shadow-sm">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "جاري المزامنة" : "مزامنة المنصة"}
          </button>
          <button onClick={() => exportTicketsWorkbook(filtered, schools)}
            className="flex items-center gap-2 bg-white text-primary border border-primary/25 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/5 transition-colors shadow-sm"
            title={`تصدير ${filtered.length.toLocaleString("ar-SA")} بلاغ إلى Excel`}>
            <Download className="w-4 h-4" />
            تصدير التحليل
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            إضافة بلاغ
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {syncMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "إجمالي البلاغات", value: stats.total, color: "bg-white border-border", icon: BarChart3 },
          { label: "جديد", value: stats.new, color: "bg-blue-50 border-blue-200 text-blue-800", icon: Headphones },
          { label: "تحت الإجراء", value: stats.inProgress, color: "bg-amber-50 border-amber-200 text-amber-800", icon: Clock },
          { label: "مغلق", value: stats.closed, color: "bg-gray-50 border-gray-200 text-gray-700", icon: CheckCircle2 },
          { label: "حرج", value: stats.critical, color: "bg-red-50 border-red-200 text-red-800", icon: AlertTriangle },
          { label: "من المنصة", value: stats.synced, color: "bg-teal-50 border-teal-200 text-teal-800", icon: RefreshCw },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`border rounded-xl p-3.5 ${s.color}`}>
              <Icon className="w-4 h-4 mb-2 opacity-75" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">متوسط عمر البلاغات المفتوحة</p>
          <p className="text-lg font-bold mt-1">{stats.avgAge} يوم</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">أكثر مدرسة لديها بلاغات</p>
          <p className="text-lg font-bold mt-1">{leaders.school}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">التصنيف المتصدر</p>
          <p className="text-lg font-bold mt-1">{leaders.category}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث برقم البلاغ أو المدرسة أو الوصف..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TicketStatus | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="الكل">كل الحالات</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as TicketType | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="الكل">كل الأنواع</option>
            {TICKET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TicketPriority | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="الكل">كل الأولويات</option>
            {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {tickets.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">لا توجد بيانات حالياً</p>
            <p className="text-muted-foreground text-sm mt-1">انقر على "إضافة بلاغ" لتسجيل بلاغ جديد</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم البلاغ</th>
                  <th>مقدم البلاغ</th>
                  <th>المشكلة</th>
                  <th>المدرسة</th>
                  <th>المحافظة</th>
                  <th>نوع البلاغ</th>
                  <th>وصف البلاغ</th>
                  <th>تاريخ البلاغ</th>
                  <th>حالة البلاغ</th>
                  <th>الأولوية</th>
                  <th>التصنيف</th>
                  <th>المصدر</th>
                  <th className="w-20">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-primary">
                        <Hash className="w-3.5 h-3.5" />
                        {ticket.ticketNumber}
                      </div>
                    </td>
                    <td>{ticket.reporterName || ticket.principalName}</td>
                    <td>
                      <p className="font-medium text-foreground">{ticket.problem || ticket.ticketType}</p>
                    </td>
                    <td>
                      <p className="font-medium text-foreground">{ticket.schoolName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.principalName}</p>
                    </td>
                    <td>{ticket.governorate}</td>
                    <td>
                      <span className={`badge ${TYPE_COLORS[ticket.ticketType]}`}>{ticket.ticketType}</span>
                    </td>
                    <td>
                      <p className="text-sm max-w-44 line-clamp-2">{ticket.description}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {formatDate(ticket.ticketDate)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        status={ticket.status}
                        onChange={(s) => updateTicket(ticket.id, { status: s })}
                      />
                    </td>
                    <td>
                      <span className={`badge ${PRIORITY_COLORS[inferPriority(ticket)]}`}>{inferPriority(ticket)}</span>
                    </td>
                    <td>
                      <span className="badge bg-slate-50 text-slate-700">{classifyTicket(ticket)}</span>
                    </td>
                    <td>
                      <span className="badge bg-teal-50 text-teal-700">{ticket.source ?? "البوابة"}</span>
                    </td>
                    <td>
                      <button onClick={() => setSelected(ticket)}
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
        <AddModal schools={schools} onClose={() => setShowAdd(false)} onSave={addTicket} />
      )}

      {selectedFull && (
        <DetailsModal
          ticket={selectedFull}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updateTicket(selectedFull.id, patch)}
          onDelete={() => { deleteTicket(selectedFull.id); setSelected(null); }}
        />
      )}
    </div>
  );
}

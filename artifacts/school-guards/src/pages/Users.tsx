import { useState, useMemo } from "react";
import {
  Users as UsersIcon, UserPlus, Lock, Eye, EyeOff,
  ShieldCheck, Edit2, CheckCircle, XCircle, X,
  LogIn, LogOut, Crown, Briefcase, KeyRound,
  Power, PowerOff, ChevronDown, Calendar,
} from "lucide-react";
import {
  useUsers, ROLE_COLORS, ROLE_PERMISSIONS,
  type UserRole, type UserStatus, type Employee,
} from "../store/useUsers";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ["مدير النظام", "موظف عمليات", "مشرف متابعة", "قراءة فقط"];

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  "مدير النظام": <Crown className="w-3.5 h-3.5" />,
  "موظف عمليات": <Briefcase className="w-3.5 h-3.5" />,
  "مشرف متابعة": <ShieldCheck className="w-3.5 h-3.5" />,
  "قراءة فقط": <Eye className="w-3.5 h-3.5" />,
};

const DEFAULT_ADMIN_ID = "default-admin-001";

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-foreground mb-1.5">
      {children}{required && <span className="text-red-500 mr-1">*</span>}
    </label>
  );
}

function PasswordInput({
  value, onChange, placeholder, autoComplete,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        autoComplete={autoComplete}
        dir="ltr"
        className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ModalHeader({ title, icon, onClose }: {
  title: string; icon: React.ReactNode; onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
      style={{ background: "hsl(174 65% 28%)" }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
          {icon}
        </div>
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      <button onClick={onClose}
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (u: string, p: string) => Promise<boolean> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const ok = await onLogin(username, password);
      if (!ok) setError("اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[64vh]">
      <div className="bg-white rounded-2xl border border-border shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "hsl(174 65% 28%)" }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-foreground">صلاحيات الموظفين</h2>
          <p className="text-muted-foreground text-sm mt-1">
            هذه الصفحة مخصصة لمديري النظام فقط
          </p>
        </div>

        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">بيانات الدخول الافتراضية:</p>
          <p>اسم المستخدم: <span className="font-mono font-bold">admin</span></p>
          <p>كلمة المرور: <span className="font-mono font-bold">admin@123</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel required>اسم المستخدم</FieldLabel>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="username" dir="ltr" autoComplete="username"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
          </div>
          <div>
            <FieldLabel required>كلمة المرور</FieldLabel>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <LogIn className="w-4 h-4" />}
            {submitting ? "جارٍ التحقق…" : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ currentUser, onLogout }: { currentUser: Employee; onLogout: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">غير مصرح بالوصول</h2>
        <p className="text-muted-foreground text-sm mt-2">
          هذه الصفحة مخصصة لمديري النظام فقط.
          <br />حسابك الحالي (<span className="font-semibold">{currentUser.role}</span>) لا يملك هذه الصلاحية.
        </p>
        <button onClick={onLogout}
          className="mt-5 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors">
          <LogOut className="w-4 h-4" />
          تسجيل خروج وتبديل الحساب
        </button>
      </div>
    </div>
  );
}

// ─── Add / Edit employee modal ────────────────────────────────────────────────

function EmployeeModal({
  mode, employee, employees, onClose, onSave,
}: {
  mode: "add" | "edit";
  employee?: Employee;
  employees: Employee[];
  onClose: () => void;
  onSave: (data: Omit<Employee, "id" | "createdAt" | "lastLogin">) => void;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [username, setUsername] = useState(employee?.username ?? "");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? "");
  const [role, setRole] = useState<UserRole>(employee?.role ?? "موظف عمليات");
  const [status, setStatus] = useState<UserStatus>(employee?.status ?? "نشط");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("يرجى إدخال اسم الموظف"); return; }
    if (!username.trim()) { setError("يرجى إدخال اسم المستخدم"); return; }
    const dup = employees.find((emp) => emp.username === username.trim() && emp.id !== employee?.id);
    if (dup) { setError("اسم المستخدم مستخدم من قبل"); return; }
    if (mode === "add") {
      if (!password.trim()) { setError("يرجى إدخال كلمة المرور"); return; }
      if (password !== confirmPw) { setError("كلمتا المرور غير متطابقتين"); return; }
    } else if (password && password !== confirmPw) {
      setError("كلمتا المرور غير متطابقتين"); return;
    }
    setError("");
    onSave({
      name: name.trim(),
      username: username.trim(),
      password: password.trim() || employee?.password || "",
      jobTitle: jobTitle.trim(),
      role,
      status,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <ModalHeader
          title={mode === "add" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}
          icon={mode === "add" ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name + username */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>اسم الموظف</FieldLabel>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <FieldLabel required>اسم المستخدم</FieldLabel>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="username" dir="ltr" autoComplete="off"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required={mode === "add"}>
                كلمة المرور
                {mode === "edit" && <span className="text-xs font-normal text-muted-foreground mr-1">(اختياري)</span>}
              </FieldLabel>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div>
              <FieldLabel required={mode === "add" || password.length > 0}>تأكيد كلمة المرور</FieldLabel>
              <PasswordInput value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
            </div>
          </div>

          {/* Job title */}
          <div>
            <FieldLabel>المسمى الوظيفي</FieldLabel>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: موظف متابعة أمن مدرسي"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Role selector */}
          <div>
            <FieldLabel required>الدور / الصلاحية</FieldLabel>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {ALL_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all text-right
                    ${role === r ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/40"}`}>
                  {ROLE_ICONS[r]}
                  {r}
                </button>
              ))}
            </div>
            {/* Permissions preview */}
            <div className="bg-muted/40 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">صلاحيات هذا الدور:</p>
              <ul className="space-y-1">
                {ROLE_PERMISSIONS[role].map((p) => (
                  <li key={p} className="text-xs text-foreground flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Status */}
          <div>
            <FieldLabel>الحالة</FieldLabel>
            <div className="flex gap-3">
              {(["نشط", "غير نشط"] as UserStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                    ${status === s
                      ? s === "نشط" ? "border-green-500 bg-green-50 text-green-800" : "border-gray-400 bg-gray-100 text-gray-700"
                      : "border-border text-foreground hover:border-primary/40"}`}>
                  {s === "نشط" ? "✅ نشط" : "⛔ غير نشط"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
              {mode === "add" ? "إضافة الموظف" : "حفظ التعديلات"}
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

// ─── Reset password modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ employee, onClose, onSave }: {
  employee: Employee; onClose: () => void; onSave: (pw: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) { setError("يرجى إدخال كلمة المرور الجديدة"); return; }
    if (password.length < 6) { setError("يجب أن تكون كلمة المرور 6 أحرف على الأقل"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    setError("");
    onSave(password.trim());
    setDone(true);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader
          title="إعادة تعيين كلمة المرور"
          icon={<KeyRound className="w-5 h-5" />}
          onClose={onClose}
        />
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-bold text-foreground">تم إعادة تعيين كلمة المرور</p>
              <p className="text-muted-foreground text-sm mt-1">
                تم تحديث كلمة مرور الموظف <span className="font-semibold">{employee.name}</span> بنجاح.
              </p>
              <button onClick={onClose}
                className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                إغلاق
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee info */}
              <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_COLORS[employee.role]}`}>
                  {employee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">@{employee.username} — {employee.role}</p>
                </div>
              </div>

              <div>
                <FieldLabel required>كلمة المرور الجديدة</FieldLabel>
                <PasswordInput value={password} onChange={setPassword} placeholder="6 أحرف على الأقل" autoComplete="new-password" />
              </div>
              <div>
                <FieldLabel required>تأكيد كلمة المرور</FieldLabel>
                <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit"
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  حفظ كلمة المرور
                </button>
                <button type="button" onClick={onClose}
                  className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Role avatar ──────────────────────────────────────────────────────────────

function RoleAvatar({ employee }: { employee: Employee }) {
  const colors: Record<UserRole, string> = {
    "مدير النظام": "bg-rose-100 text-rose-700",
    "موظف عمليات": "bg-amber-100 text-amber-700",
    "مشرف متابعة": "bg-blue-100 text-blue-700",
    "قراءة فقط": "bg-gray-100 text-gray-500",
  };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors[employee.role]}`}>
      {employee.name.charAt(0)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users() {
  const { employees, currentUser, isAdmin, login, logout, addEmployee, updateEmployee, resetPassword, toggleStatus } = useUsers();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === "نشط").length,
    inactive: employees.filter((e) => e.status === "غير نشط").length,
  }), [employees]);

  // App.tsx guarantees we only render when logged in; this guard satisfies TS.
  if (!currentUser) return null;

  // ── Logged in but not admin (safety-net — AdminOnly in App.tsx handles redirect) ──
  if (!isAdmin) {
    return <AccessDenied currentUser={currentUser} onLogout={logout} />;
  }

  // ── Admin view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">صلاحيات الموظفين</h2>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة حسابات الموظفين وضبط صلاحيات الوصول للبوابة</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Current admin badge */}
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
            {currentUser.name}
          </div>
          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs bg-muted text-muted-foreground hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            خروج
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" />
            إضافة موظف
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-border rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">إجمالي الموظفين</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
          <p className="text-xs text-green-700 mt-0.5">حساب نشط</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
          <p className="text-xs text-gray-500 mt-0.5">حساب معطّل</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الموظف</th>
                <th>اسم المستخدم</th>
                <th>المسمى الوظيفي</th>
                <th>الدور / الصلاحية</th>
                <th>الحالة</th>
                <th>آخر دخول</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const isDefault = emp.id === DEFAULT_ADMIN_ID;
                return (
                  <tr key={emp.id} className={emp.status === "غير نشط" ? "table-row-muted" : undefined}>
                    {/* Row number */}
                    <td className="text-muted-foreground text-xs w-8 text-center">{i + 1}</td>

                    {/* Name + avatar */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <RoleAvatar employee={emp} />
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-tight">{emp.name}</p>
                          {isDefault && (
                            <span className="text-[10px] text-muted-foreground">الحساب الافتراضي</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Username — no password shown */}
                    <td>
                      <code className="text-sm bg-muted/60 px-2 py-0.5 rounded font-mono">
                        {emp.username}
                      </code>
                    </td>

                    {/* Job title */}
                    <td className="text-sm">{emp.jobTitle || <span className="text-muted-foreground">—</span>}</td>

                    {/* Role badge */}
                    <td>
                      <span className={`badge flex items-center gap-1.5 w-fit ${ROLE_COLORS[emp.role]}`}>
                        {ROLE_ICONS[emp.role]}
                        {emp.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      {emp.status === "نشط"
                        ? <span className="badge bg-green-100 text-green-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />نشط</span>
                        : <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" />غير نشط</span>
                      }
                    </td>

                    {/* Last login */}
                    <td>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        {emp.lastLogin ? (
                          <>
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            {formatDate(emp.lastLogin)}
                          </>
                        ) : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Edit */}
                        <button onClick={() => setEditTarget(emp)}
                          className="flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1.5 rounded-lg transition-colors font-medium">
                          <Edit2 className="w-3.5 h-3.5" />
                          تعديل
                        </button>

                        {/* Toggle status */}
                        <button onClick={() => toggleStatus(emp.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium border
                            ${emp.status === "نشط"
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                              : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"}`}>
                          {emp.status === "نشط" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          {emp.status === "نشط" ? "إيقاف" : "تفعيل"}
                        </button>

                        {/* Reset password */}
                        <button onClick={() => setResetTarget(emp)}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1.5 rounded-lg transition-colors font-medium">
                          <KeyRound className="w-3.5 h-3.5" />
                          كلمة المرور
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {showAdd && (
        <EmployeeModal
          mode="add"
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSave={(data) => {
            addEmployee({
              id: genId(),
              ...data,
              createdAt: new Date().toISOString(),
            });
            setShowAdd(false);
          }}
        />
      )}

      {editTarget && (
        <EmployeeModal
          mode="edit"
          employee={editTarget}
          employees={employees}
          onClose={() => setEditTarget(null)}
          onSave={(data) => {
            updateEmployee(editTarget.id, data);
            setEditTarget(null);
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          employee={resetTarget}
          onClose={() => setResetTarget(null)}
          onSave={(pw) => {
            resetPassword(resetTarget.id, pw);
          }}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Users as UsersIcon, UserPlus, Lock, Eye, EyeOff,
  ShieldCheck, Edit2, Trash2, Power, PowerOff,
  CheckCircle, XCircle, X, ChevronDown, LogIn, LogOut,
  Crown, Briefcase, Search as SearchIcon, Info,
} from "lucide-react";
import { useUsers, ROLE_COLORS, ROLE_PERMISSIONS, type UserRole, type UserStatus, type Employee } from "../store/useUsers";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ["مدير النظام", "موظف عمليات", "مشرف متابعة", "قراءة فقط"];

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  "مدير النظام": <Crown className="w-3.5 h-3.5" />,
  "موظف عمليات": <Briefcase className="w-3.5 h-3.5" />,
  "مشرف متابعة": <ShieldCheck className="w-3.5 h-3.5" />,
  "قراءة فقط": <Eye className="w-3.5 h-3.5" />,
};

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (u: string, p: string) => boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onLogin(username, password)) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير نشط");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-border shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "hsl(174 65% 28%)" }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-foreground">صلاحيات الموظفين</h2>
          <p className="text-muted-foreground text-sm mt-1">يرجى تسجيل الدخول للمتابعة</p>
        </div>

        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">بيانات الدخول الافتراضية:</p>
          <p>اسم المستخدم: <span className="font-mono font-bold">admin</span></p>
          <p>كلمة المرور: <span className="font-mono font-bold">admin@123</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">اسم المستخدم</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                dir="ltr" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}
          <button type="submit"
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
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
        <h2 className="text-lg font-bold text-foreground">غير مصرح</h2>
        <p className="text-muted-foreground text-sm mt-2">
          هذه الصفحة مخصصة لمديري النظام فقط.
          <br />حسابك الحالي ({currentUser.role}) لا يملك صلاحية الوصول.
        </p>
        <button onClick={onLogout}
          className="mt-4 flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors">
          <LogOut className="w-4 h-4" />
          تسجيل خروج وتبديل الحساب
        </button>
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-foreground mb-1.5">
      {children}{required && <span className="text-red-500 mr-0.5">*</span>}
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange, required }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void; required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
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

// ─── Add/Edit modal ───────────────────────────────────────────────────────────

function EmployeeModal({
  mode, employee, employees, onClose, onSave,
}: {
  mode: "add" | "edit";
  employee?: Employee;
  employees: Employee[];
  onClose: () => void;
  onSave: (data: Partial<Employee>) => void;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [username, setUsername] = useState(employee?.username ?? "");
  const [password, setPassword] = useState(employee?.password ?? "");
  const [showPw, setShowPw] = useState(false);
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? "");
  const [role, setRole] = useState<UserRole>(employee?.role ?? "موظف عمليات");
  const [status, setStatus] = useState<UserStatus>(employee?.status ?? "نشط");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("يرجى إدخال اسم الموظف"); return; }
    if (!username.trim()) { setError("يرجى إدخال اسم المستخدم"); return; }
    const duplicate = employees.find(
      (emp) => emp.username === username.trim() && emp.id !== employee?.id
    );
    if (duplicate) { setError("اسم المستخدم مستخدم بالفعل"); return; }
    if (mode === "add" && !password.trim()) { setError("يرجى إدخال كلمة المرور"); return; }
    setError("");
    onSave({ name: name.trim(), username: username.trim(), password: password.trim() || employee?.password, jobTitle: jobTitle.trim(), role, status });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0"
          style={{ background: "hsl(174 65% 28%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              {mode === "add" ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </div>
            <h2 className="text-white font-bold text-sm">
              {mode === "add" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <FieldLabel required>اسم الموظف</FieldLabel>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>اسم المستخدم</FieldLabel>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
            </div>
            <div>
              <FieldLabel required={mode === "add"}>
                كلمة المرور
                {mode === "edit" && <span className="text-xs font-normal text-muted-foreground mr-1">(اتركها فارغة للإبقاء)</span>}
              </FieldLabel>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "edit" ? "••••••••" : "كلمة المرور"}
                  dir="ltr"
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>المسمى الوظيفي</FieldLabel>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: موظف متابعة أمن مدرسي"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <FieldLabel required>الدور / الصلاحية</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all text-right
                    ${role === r ? `border-primary bg-primary text-white` : "border-border text-foreground hover:border-primary/40"}`}>
                  {ROLE_ICONS[r]}
                  {r}
                </button>
              ))}
            </div>
            {/* Permissions preview */}
            <div className="mt-2 bg-muted/40 rounded-xl px-3 py-2.5">
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

          <SelectField label="الحالة" value={status} options={["نشط", "غير نشط"] as UserStatus[]} onChange={setStatus} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">{error}</div>}

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

// ─── Role card (permissions reference) ───────────────────────────────────────

function RoleCard({ role }: { role: UserRole }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`badge flex items-center gap-1.5 ${ROLE_COLORS[role]}`}>
          {ROLE_ICONS[role]}
          {role}
        </span>
      </div>
      <ul className="space-y-1.5">
        {ROLE_PERMISSIONS[role].map((p) => (
          <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users() {
  const { employees, currentUser, isAdmin, login, logout, addEmployee, updateEmployee, deleteEmployee, toggleStatus } = useUsers();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "الكل">("الكل");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "الكل">("الكل");
  const [showRoles, setShowRoles] = useState(false);

  const filtered = useMemo(() =>
    employees.filter((e) => {
      const q = search.trim();
      const matchSearch = !q || e.name.includes(q) || e.username.includes(q) || e.jobTitle.includes(q);
      return matchSearch &&
        (filterRole === "الكل" || e.role === filterRole) &&
        (filterStatus === "الكل" || e.status === filterStatus);
    }),
    [employees, search, filterRole, filterStatus]
  );

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === "نشط").length,
    byRole: ALL_ROLES.reduce((acc, r) => { acc[r] = employees.filter((e) => e.role === r).length; return acc; }, {} as Record<UserRole, number>),
  }), [employees]);

  if (!currentUser) {
    return <LoginScreen onLogin={(u, p) => !!login(u, p)} />;
  }

  if (!isAdmin) {
    return <AccessDenied currentUser={currentUser} onLogout={logout} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">صلاحيات الموظفين</h2>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة حسابات الموظفين وصلاحيات الوصول للبوابة</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">إجمالي الموظفين</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
          <p className="text-xs text-green-700 mt-0.5">نشط</p>
        </div>
        {ALL_ROLES.map((r) => (
          <div key={r} className={`rounded-xl p-3 text-center border ${ROLE_COLORS[r].replace("text-", "border-").replace("bg-", "border-")}`}>
            <p className={`text-2xl font-bold ${ROLE_COLORS[r].split(" ")[1]}`}>{stats.byRole[r]}</p>
            <p className={`text-xs mt-0.5 ${ROLE_COLORS[r].split(" ")[1]} opacity-80`}>{r}</p>
          </div>
        ))}
      </div>

      {/* Role reference toggle */}
      <button onClick={() => setShowRoles(!showRoles)}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        <Info className="w-4 h-4" />
        {showRoles ? "إخفاء" : "عرض"} مرجع الصلاحيات
      </button>

      {showRoles && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALL_ROLES.map((r) => <RoleCard key={r} role={r} />)}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث بالاسم أو اسم المستخدم أو المسمى..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="relative">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="الكل">كل الأدوار</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as UserStatus | "الكل")}
            className="appearance-none pl-8 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="الكل">كل الحالات</option>
            <option value="نشط">نشط</option>
            <option value="غير نشط">غير نشط</option>
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UsersIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">لا توجد نتائج مطابقة</p>
          </div>
        ) : (
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
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const isDefault = emp.id === "default-admin-001";
                  return (
                    <tr key={emp.id} className={emp.status === "غير نشط" ? "opacity-60" : undefined}>
                      <td className="text-muted-foreground text-xs w-8">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ROLE_COLORS[emp.role]}`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                            {isDefault && <p className="text-xs text-muted-foreground">الحساب الافتراضي</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-sm text-foreground bg-muted/60 px-2 py-0.5 rounded">
                          {emp.username}
                        </span>
                      </td>
                      <td className="text-sm">{emp.jobTitle || "—"}</td>
                      <td>
                        <span className={`badge flex items-center gap-1.5 w-fit ${ROLE_COLORS[emp.role]}`}>
                          {ROLE_ICONS[emp.role]}
                          {emp.role}
                        </span>
                      </td>
                      <td>
                        {emp.status === "نشط"
                          ? <span className="badge bg-green-100 text-green-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />نشط</span>
                          : <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" />غير نشط</span>
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditTarget(emp)}
                            className="flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1.5 rounded-lg transition-colors font-medium">
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          <button onClick={() => toggleStatus(emp.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium border
                              ${emp.status === "نشط"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                                : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"}`}>
                            {emp.status === "نشط" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            {emp.status === "نشط" ? "تعطيل" : "تفعيل"}
                          </button>
                          {!isDefault && (
                            <button
                              onClick={() => { if (confirm(`هل أنت متأكد من حذف موظف "${emp.name}"؟`)) deleteEmployee(emp.id); }}
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1.5 rounded-lg transition-colors font-medium">
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
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

      {/* Modals */}
      {showAdd && (
        <EmployeeModal
          mode="add"
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSave={(data) => {
            addEmployee({
              id: genId(),
              name: data.name!,
              username: data.username!,
              password: data.password!,
              jobTitle: data.jobTitle ?? "",
              role: data.role!,
              status: data.status!,
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
    </div>
  );
}

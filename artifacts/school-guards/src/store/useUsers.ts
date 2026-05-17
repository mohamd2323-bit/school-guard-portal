import { useState, useEffect, useCallback } from "react";

export type UserRole = "مدير النظام" | "موظف عمليات" | "مشرف متابعة" | "قراءة فقط";
export type UserStatus = "نشط" | "غير نشط";

export interface Employee {
  id: string;
  name: string;
  username: string;
  password: string;
  jobTitle: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  "مدير النظام": [
    "عرض جميع الصفحات",
    "إضافة وتعديل وحذف البيانات",
    "استيراد وتصدير البيانات",
    "إدارة المستخدمين والصلاحيات",
  ],
  "موظف عمليات": [
    "إضافة وتعديل العمليات",
    "إضافة وتعديل التكاليف",
    "إضافة وتعديل الاحتياجات",
    "إضافة وتعديل المخالفات",
    "إضافة وتعديل البلاغات",
  ],
  "مشرف متابعة": [
    "عرض جميع السجلات",
    "إضافة ملاحظات فقط",
  ],
  "قراءة فقط": [
    "عرض البيانات فقط",
    "لا يمكن الإضافة أو التعديل أو الحذف",
  ],
};

export const ROLE_COLORS: Record<UserRole, string> = {
  "مدير النظام": "bg-rose-100 text-rose-800",
  "موظف عمليات": "bg-amber-100 text-amber-800",
  "مشرف متابعة": "bg-blue-100 text-blue-800",
  "قراءة فقط": "bg-gray-100 text-gray-600",
};

const USERS_KEY = "school_guards_users";
const SESSION_KEY = "school_guards_session";

const DEFAULT_ADMIN: Employee = {
  id: "default-admin-001",
  name: "مدير النظام",
  username: "admin",
  password: "admin@123",
  jobTitle: "مدير أمن وسلامة",
  role: "مدير النظام",
  status: "نشط",
  createdAt: new Date().toISOString(),
};

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const initial = [DEFAULT_ADMIN];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Employee[];
    if (!parsed.some((e) => e.id === DEFAULT_ADMIN.id)) {
      const withAdmin = [DEFAULT_ADMIN, ...parsed];
      localStorage.setItem(USERS_KEY, JSON.stringify(withAdmin));
      return withAdmin;
    }
    return parsed;
  } catch {
    return [DEFAULT_ADMIN];
  }
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(employees));
}

function loadSession(): Employee | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Employee;
  } catch { return null; }
}

function saveSession(user: Employee | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

let userListeners: Array<() => void> = [];
let sharedEmployees: Employee[] = loadEmployees();
let sharedSession: Employee | null = loadSession();

function notifyUsers() {
  userListeners.forEach((fn) => fn());
}

export function useUsers() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    userListeners.push(listener);
    return () => { userListeners = userListeners.filter((l) => l !== listener); };
  }, []);

  const addEmployee = useCallback((emp: Employee) => {
    sharedEmployees = [emp, ...sharedEmployees];
    saveEmployees(sharedEmployees);
    notifyUsers();
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    sharedEmployees = sharedEmployees.map((e) => e.id === id ? { ...e, ...patch } : e);
    saveEmployees(sharedEmployees);
    if (sharedSession?.id === id) {
      const updated = sharedEmployees.find((e) => e.id === id) ?? null;
      sharedSession = updated;
      saveSession(updated);
    }
    notifyUsers();
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    if (id === DEFAULT_ADMIN.id) return;
    sharedEmployees = sharedEmployees.filter((e) => e.id !== id);
    saveEmployees(sharedEmployees);
    notifyUsers();
  }, []);

  const toggleStatus = useCallback((id: string) => {
    sharedEmployees = sharedEmployees.map((e) =>
      e.id === id ? { ...e, status: e.status === "نشط" ? "غير نشط" : "نشط" } : e
    );
    saveEmployees(sharedEmployees);
    notifyUsers();
  }, []);

  const resetPassword = useCallback((id: string, newPassword: string) => {
    sharedEmployees = sharedEmployees.map((e) =>
      e.id === id ? { ...e, password: newPassword } : e
    );
    saveEmployees(sharedEmployees);
    notifyUsers();
  }, []);

  const login = useCallback((username: string, password: string): Employee | null => {
    const user = sharedEmployees.find(
      (e) => e.username === username.trim() && e.password === password && e.status === "نشط"
    );
    if (user) {
      const now = new Date().toISOString();
      sharedEmployees = sharedEmployees.map((e) =>
        e.id === user.id ? { ...e, lastLogin: now } : e
      );
      saveEmployees(sharedEmployees);
      const updated = { ...user, lastLogin: now };
      sharedSession = updated;
      saveSession(updated);
      notifyUsers();
      return updated;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    sharedSession = null;
    saveSession(null);
    notifyUsers();
  }, []);

  return {
    employees: sharedEmployees,
    currentUser: sharedSession,
    isAdmin: sharedSession?.role === "مدير النظام",
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleStatus,
    resetPassword,
    login,
    logout,
  };
}

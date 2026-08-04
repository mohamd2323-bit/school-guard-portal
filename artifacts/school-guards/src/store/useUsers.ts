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

// ─── Session (localStorage — per-browser login state only) ───────────────────

const SESSION_KEY = "school_guards_session";

function loadSession(): Employee | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Employee;
  } catch {
    return null;
  }
}

function saveSession(user: Employee | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

// ─── Default admin (seeded on first run) ──────────────────────────────────────

export const DEFAULT_ADMIN: Employee = {
  id: "default-admin-001",
  name: "مدير النظام",
  username: "admin",
  password: "admin@123",
  jobTitle: "مدير أمن وسلامة",
  role: "مدير النظام",
  status: "نشط",
  createdAt: "2024-01-01T00:00:00.000Z",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Employee[]>;
}

async function persistEmployees(employees: Employee[]): Promise<void> {
  await fetch("/api/employees", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employees),
  });
}

function ensureAdmin(employees: Employee[]): Employee[] {
  if (employees.some((e) => e.id === DEFAULT_ADMIN.id)) return employees;
  return [DEFAULT_ADMIN, ...employees];
}

// ─── Module-level shared state ────────────────────────────────────────────────

let userListeners: Array<() => void> = [];
let sharedEmployees: Employee[] = [];
let sharedSession: Employee | null = loadSession();
let usersInitPromise: Promise<void> | null = null;
let employeesLoadedFromServer = false;

function notifyUsers() {
  userListeners.forEach((fn) => fn());
}

function initEmployees(): Promise<void> {
  if (usersInitPromise) return usersInitPromise;

  usersInitPromise = (async () => {
    try {
      let employees = await fetchEmployees();
      employeesLoadedFromServer = true;

      // First run: seed default admin if list is empty
      if (employees.length === 0) {
        employees = [DEFAULT_ADMIN];
        await persistEmployees(employees);
      } else {
        employees = ensureAdmin(employees);
      }
      sharedEmployees = employees;

      // Keep session user in sync with server data
      if (sharedSession) {
        const fresh = sharedEmployees.find((e) => e.id === sharedSession!.id);
        if (!fresh || fresh.status !== "نشط") {
          sharedSession = null;
          saveSession(null);
        } else {
          sharedSession = fresh;
          saveSession(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
      employeesLoadedFromServer = false;
      // Allow the next attempt to retry the server instead of trusting fallback data.
      usersInitPromise = null;
      sharedEmployees = [DEFAULT_ADMIN];
    }

    notifyUsers();
  })();

  return usersInitPromise;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUsers() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    userListeners.push(listener);
    initEmployees();
    return () => {
      userListeners = userListeners.filter((l) => l !== listener);
    };
  }, []);

  const addEmployee = useCallback((emp: Employee) => {
    sharedEmployees = ensureAdmin([emp, ...sharedEmployees]);
    persistEmployees(sharedEmployees).catch(console.error);
    notifyUsers();
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    sharedEmployees = ensureAdmin(
      sharedEmployees.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
    persistEmployees(sharedEmployees).catch(console.error);
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
    persistEmployees(sharedEmployees).catch(console.error);
    notifyUsers();
  }, []);

  const toggleStatus = useCallback((id: string) => {
    sharedEmployees = ensureAdmin(
      sharedEmployees.map((e) =>
        e.id === id ? { ...e, status: e.status === "نشط" ? "غير نشط" : "نشط" } : e
      )
    );
    persistEmployees(sharedEmployees).catch(console.error);
    notifyUsers();
  }, []);

  const resetPassword = useCallback((id: string, newPassword: string) => {
    sharedEmployees = ensureAdmin(
      sharedEmployees.map((e) => (e.id === id ? { ...e, password: newPassword } : e))
    );
    persistEmployees(sharedEmployees).catch(console.error);
    notifyUsers();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<Employee | null> => {
    try {
      // Wait for the authoritative server list before any code can persist it.
      await initEmployees();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) return null;
      const user = await res.json() as Employee;

      // Update lastLogin only when the employee list came from the server.
      // Never replace the database with fallback [DEFAULT_ADMIN] after a cold start.
      const now = new Date().toISOString();
      if (employeesLoadedFromServer) {
        sharedEmployees = ensureAdmin(
          sharedEmployees.map((e) => (e.id === user.id ? { ...e, lastLogin: now } : e))
        );
        persistEmployees(sharedEmployees).catch(console.error);
      }

      const updated = { ...user, lastLogin: now };
      sharedSession = updated;
      saveSession(updated);
      notifyUsers();
      return updated;
    } catch (err) {
      console.error("Login error:", err);
      return null;
    }
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

import { useState, useEffect, useCallback } from "react";
import type {
  Guard,
  School,
  Need,
  NeedStatus,
  Ticket,
  TicketStatus,
  Operation,
  OperationType,
  Violation,
  AppData,
} from "../types";

import { demoGuards, demoSchools } from "../data/demoData";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const STORAGE_KEY = "school_guards_data";
const BACKUP_KEY = "school_guards_backup";

export interface BackupSnapshot {
  timestamp: string;
  data: AppData;
  users: string | null;
}

export function getBackupSnapshot(): BackupSnapshot | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupSnapshot;
  } catch {
    return null;
  }
}

export function saveBackupSnapshot(): BackupSnapshot {
  const snapshot: BackupSnapshot = {
    timestamp: new Date().toISOString(),
    data: sharedData,
    users: localStorage.getItem("school_guards_users"),
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function restoreBackupSnapshot(): boolean {
  const snapshot = getBackupSnapshot();
  if (!snapshot) return false;
  sharedData = {
    guards: snapshot.data.guards ?? [],
    schools: snapshot.data.schools ?? [],
    needs: snapshot.data.needs ?? [],
    tickets: snapshot.data.tickets ?? [],
    operations: snapshot.data.operations ?? [],
    violations: snapshot.data.violations ?? [],
  };
  saveToStorage(sharedData);
  if (snapshot.users) {
    localStorage.setItem("school_guards_users", snapshot.users);
  }
  listeners.forEach((fn) => fn());
  return true;
}

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { guards: [], schools: [], needs: [], tickets: [], operations: [], violations: [] };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      guards: parsed.guards ?? [],
      schools: parsed.schools ?? [],
      needs: parsed.needs ?? [],
      tickets: parsed.tickets ?? [],
      operations: parsed.operations ?? [],
      violations: parsed.violations ?? [],
    };
  } catch {
    return { guards: [], schools: [], needs: [], tickets: [], operations: [], violations: [] };
  }
}

function saveToStorage(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let listeners: Array<() => void> = [];
let sharedData: AppData = loadFromStorage();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

export function useStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const setData = useCallback((data: AppData) => {
    sharedData = data;
    saveToStorage(data);
    notifyAll();
  }, []);

  // ── Import / demo ──────────────────────────────────────────────────────────
  const importData = useCallback(
    (guards: Guard[], schools: School[]) => {
      setData({
        ...sharedData,
        guards: [...sharedData.guards.filter((g) => g.isDemo), ...guards],
        schools: [...sharedData.schools.filter((s) => s.isDemo), ...schools],
      });
    },
    [setData]
  );

  const clearData = useCallback(() => {
    setData({
      ...sharedData,
      guards: sharedData.guards.filter((g) => g.isDemo),
      schools: sharedData.schools.filter((s) => s.isDemo),
    });
  }, [setData]);

  const loadDemoData = useCallback(() => {
    setData({
      ...sharedData,
      guards: [...demoGuards, ...sharedData.guards.filter((g) => !g.isDemo)],
      schools: [...demoSchools, ...sharedData.schools.filter((s) => !s.isDemo)],
    });
  }, [setData]);

  const clearDemoData = useCallback(() => {
    setData({
      ...sharedData,
      guards: sharedData.guards.filter((g) => !g.isDemo),
      schools: sharedData.schools.filter((s) => !s.isDemo),
    });
  }, [setData]);

  // ── Needs ──────────────────────────────────────────────────────────────────
  const addNeed = useCallback(
    (need: Need) => setData({ ...sharedData, needs: [need, ...sharedData.needs] }),
    [setData]
  );

  const updateNeedStatus = useCallback(
    (id: string, status: NeedStatus) =>
      setData({ ...sharedData, needs: sharedData.needs.map((n) => (n.id === id ? { ...n, status } : n)) }),
    [setData]
  );

  const deleteNeed = useCallback(
    (id: string) => setData({ ...sharedData, needs: sharedData.needs.filter((n) => n.id !== id) }),
    [setData]
  );

  // ── Tickets ────────────────────────────────────────────────────────────────
  const addTicket = useCallback(
    (ticket: Ticket) => setData({ ...sharedData, tickets: [ticket, ...sharedData.tickets] }),
    [setData]
  );

  const updateTicket = useCallback(
    (id: string, patch: Partial<Ticket>) =>
      setData({ ...sharedData, tickets: sharedData.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
    [setData]
  );

  const deleteTicket = useCallback(
    (id: string) => setData({ ...sharedData, tickets: sharedData.tickets.filter((t) => t.id !== id) }),
    [setData]
  );

  // ── Operations ─────────────────────────────────────────────────────────────
  const addOperation = useCallback(
    (op: Operation) => setData({ ...sharedData, operations: [op, ...sharedData.operations] }),
    [setData]
  );

  const assignGuard = useCallback(
    (op: Operation, guard: Guard) =>
      setData({
        ...sharedData,
        guards: sharedData.guards.map((g) =>
          g.id === guard.id
            ? { ...g, previousSchoolId: g.schoolId, previousSchoolName: g.schoolName }
            : g
        ),
        operations: [{ ...op, assignmentStatus: "نشط" as const }, ...sharedData.operations],
      }),
    [setData]
  );

  const cancelAssignment = useCallback(
    (operationId: string, { endDate, reason, cancelledBy }: { endDate: string; reason: string; cancelledBy: string }) => {
      const origOp = sharedData.operations.find((op) => op.id === operationId);
      if (!origOp) return;
      // Guard: only cancel active "تكليف حارس" operations
      if (origOp.type !== "تكليف حارس") return;
      if (origOp.assignmentStatus === "منتهي") return;
      const guard = origOp.guardId ? sharedData.guards.find((g) => g.id === origOp.guardId) : null;

      const cancelOp: Operation = {
        id: genId(),
        type: "إنهاء تكليف" as OperationType,
        guardId: origOp.guardId,
        guardName: origOp.guardName,
        date: endDate,
        notes: reason,
        createdAt: new Date().toISOString(),
        details: {
          originalOpId: operationId,
          entity: origOp.details.entity || "",
          reason,
          cancelledBy,
          endDate,
        },
        performedBy: cancelledBy,
        assignmentStatus: "منتهي",
      };

      setData({
        ...sharedData,
        operations: [
          cancelOp,
          ...sharedData.operations.map((op) =>
            op.id === operationId ? { ...op, assignmentStatus: "منتهي" as const } : op
          ),
        ],
        guards: guard
          ? sharedData.guards.map((g) =>
              g.id === guard.id
                ? {
                    ...g,
                    schoolId: g.previousSchoolId !== undefined ? g.previousSchoolId : g.schoolId,
                    schoolName: g.previousSchoolName !== undefined ? g.previousSchoolName : g.schoolName,
                    previousSchoolId: undefined,
                    previousSchoolName: undefined,
                  }
                : g
            )
          : sharedData.guards,
      });
    },
    [setData]
  );

  const addGuard = useCallback(
    (guard: Guard, op: Operation) =>
      setData({ ...sharedData, guards: [guard, ...sharedData.guards], operations: [op, ...sharedData.operations] }),
    [setData]
  );

  const updateGuard = useCallback(
    (id: string, patch: Partial<Guard>, op: Operation) =>
      setData({
        ...sharedData,
        guards: sharedData.guards.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        operations: [op, ...sharedData.operations],
      }),
    [setData]
  );

  // ── Schools CRUD ───────────────────────────────────────────────────────────
  const addSchool = useCallback(
    (school: School) =>
      setData({ ...sharedData, schools: [school, ...sharedData.schools] }),
    [setData]
  );

  const updateSchool = useCallback(
    (id: string, patch: Partial<School>) =>
      setData({
        ...sharedData,
        schools: sharedData.schools.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        // Keep guard links in sync if name changed
        guards: sharedData.guards.map((g) =>
          g.schoolId === id
            ? { ...g, schoolName: patch.name ?? g.schoolName, governorate: patch.governorate ?? g.governorate }
            : g
        ),
      }),
    [setData]
  );

  const deleteSchool = useCallback(
    (id: string, logEntry?: { username: string; schoolName: string }) => {
      const logOp: Operation | null = logEntry
        ? {
            id: genId(),
            type: "حذف مدرسة",
            guardId: null,
            guardName: logEntry.schoolName,
            date: new Date().toISOString().split("T")[0],
            notes: "",
            createdAt: new Date().toISOString(),
            details: {
              schoolName: logEntry.schoolName,
              deletedBy: logEntry.username,
            },
          }
        : null;
      setData({
        ...sharedData,
        schools: sharedData.schools.filter((s) => s.id !== id),
        // Unlink guards — do NOT delete them
        guards: sharedData.guards.map((g) =>
          g.schoolId === id ? { ...g, schoolId: null, schoolName: null } : g
        ),
        operations: logOp
          ? [logOp, ...sharedData.operations]
          : sharedData.operations,
      });
    },
    [setData]
  );

  // ── Violations ─────────────────────────────────────────────────────────────
  const addViolation = useCallback(
    (v: Violation) => setData({ ...sharedData, violations: [v, ...sharedData.violations] }),
    [setData]
  );

  const updateViolation = useCallback(
    (id: string, patch: Partial<Violation>) =>
      setData({ ...sharedData, violations: sharedData.violations.map((v) => (v.id === id ? { ...v, ...patch } : v)) }),
    [setData]
  );

  const deleteViolation = useCallback(
    (id: string) => setData({ ...sharedData, violations: sharedData.violations.filter((v) => v.id !== id) }),
    [setData]
  );

  const hasDemoData =
    sharedData.guards.some((g) => g.isDemo) || sharedData.schools.some((s) => s.isDemo);
  const hasRealData =
    sharedData.guards.some((g) => !g.isDemo) || sharedData.schools.some((s) => !s.isDemo);

  return {
    guards: sharedData.guards,
    schools: sharedData.schools,
    needs: sharedData.needs,
    tickets: sharedData.tickets,
    operations: sharedData.operations,
    violations: sharedData.violations,
    importData,
    clearData,
    loadDemoData,
    clearDemoData,
    addNeed,
    updateNeedStatus,
    deleteNeed,
    addTicket,
    updateTicket,
    deleteTicket,
    addOperation,
    assignGuard,
    cancelAssignment,
    addGuard,
    updateGuard,
    addSchool,
    updateSchool,
    deleteSchool,
    addViolation,
    updateViolation,
    deleteViolation,
    hasDemoData,
    hasRealData,
    hasData: sharedData.guards.length > 0 || sharedData.schools.length > 0,
  };
}

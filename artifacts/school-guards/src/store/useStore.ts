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

// ─── Backup snapshots ─────────────────────────────────────────────────────────
// Stored in the shared DB so all users/devices share the same backup history.
// localStorage is used only as a migration path for old local snapshots.

const MAX_SNAPSHOTS = 5;

export interface BackupSnapshot {
  timestamp: string;
  data: AppData;
  users: string | null;
  label?: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const EMPTY_DATA: AppData = {
  guards: [],
  schools: [],
  needs: [],
  tickets: [],
  operations: [],
  violations: [],
};

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

async function apiPut(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on PUT ${path}`);
  }
}

async function loadDataFromApi(): Promise<AppData> {
  const json = await apiGet<Partial<AppData>>("/api/appdata", {});
  return {
    guards: json.guards ?? [],
    schools: json.schools ?? [],
    needs: json.needs ?? [],
    tickets: json.tickets ?? [],
    operations: json.operations ?? [],
    violations: json.violations ?? [],
  };
}

async function saveDataToApi(data: AppData): Promise<void> {
  await apiPut("/api/appdata", data);
}

async function loadBackupsFromApi(): Promise<BackupSnapshot[]> {
  const arr = await apiGet<BackupSnapshot[]>("/api/backups", []);
  // Migration: if the DB has no backups yet, check localStorage for legacy data
  if (arr.length === 0) {
    try {
      const legacy =
        localStorage.getItem("school_guards_backups") ||
        localStorage.getItem("school_guards_backup");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const migrated: BackupSnapshot[] = Array.isArray(parsed)
          ? parsed
          : [parsed];
        // Upload migrated data to DB, clear local
        void apiPut("/api/backups", migrated.slice(0, MAX_SNAPSHOTS));
        localStorage.removeItem("school_guards_backups");
        localStorage.removeItem("school_guards_backup");
        return migrated.slice(0, MAX_SNAPSHOTS);
      }
    } catch {}
  }
  return arr;
}

// ─── Module-level shared state ────────────────────────────────────────────────

let listeners: Array<() => void> = [];
let sharedData: AppData = { ...EMPTY_DATA };
let sharedBackups: BackupSnapshot[] = [];
let sharedLoading = true;
let sharedSaving = false;
let fetchInProgress = false;
let activeSaveCount = 0;   // how many PUT requests are currently in-flight
let sharedSaveError: string | null = null;

function notifyAll() {
  listeners.forEach((fn) => fn());
}

function setSaveError(msg: string | null) {
  sharedSaveError = msg;
  notifyAll();
}

// Block any background re-fetch while a PUT is still in-flight.
// This prevents the race condition where navigating between pages triggers
// a GET that returns stale server data and overwrites the optimistic update.
async function fetchData(showLoadingSpinner = false) {
  if (fetchInProgress) return;
  if (activeSaveCount > 0) return;   // wait for pending saves first
  fetchInProgress = true;
  if (showLoadingSpinner) {
    sharedLoading = true;
    notifyAll();
  }
  try {
    const tag = `[store:fetch@${Date.now()}]`;
    console.info(`${tag} GET /api/appdata`);
    [sharedData, sharedBackups] = await Promise.all([
      loadDataFromApi(),
      loadBackupsFromApi(),
    ]);
    console.info(`${tag} ✓ guards:${sharedData.guards.length} schools:${sharedData.schools.length}`);
  } catch (err) {
    console.error("[store] Fetch failed:", err);
    if (showLoadingSpinner) {
      sharedData = { ...EMPTY_DATA };
      sharedBackups = [];
    }
  } finally {
    fetchInProgress = false;
    sharedLoading = false;
    notifyAll();
  }
}

// Persist data to the server.
// - Blocks concurrent re-fetches while the PUT is in-flight (via activeSaveCount).
// - After all in-flight saves complete, triggers a server re-fetch to confirm.
// - On failure: throws so the caller can rollback the optimistic update.
async function persistData(data: AppData): Promise<void> {
  activeSaveCount++;
  sharedSaving = true;
  notifyAll();
  const tag = `[store:save@${Date.now()}]`;
  try {
    console.info(`${tag} PUT /api/appdata — guards:${data.guards.length} schools:${data.schools.length}`);
    await saveDataToApi(data);
    console.info(`${tag} ✓ server confirmed`);
    if (sharedSaveError) setSaveError(null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${tag} ✗ save failed: ${msg}`);
    setSaveError("فشل حفظ البيانات في قاعدة البيانات. يرجى المحاولة مرة أخرى.");
    throw err;   // let caller rollback
  } finally {
    activeSaveCount = Math.max(0, activeSaveCount - 1);
    sharedSaving = activeSaveCount > 0;
    notifyAll();
    // When the last in-flight save finishes, re-fetch to confirm server state.
    if (activeSaveCount === 0) {
      void fetchData(false);
    }
  }
}

/** Re-fetch all data from the server and notify all listeners. */
export function refreshStore() {
  void fetchData(false);
}

/** True while any PUT /api/appdata is in-flight. */
export function isSaving() {
  return sharedSaving;
}

// Auto-start loading when the module is imported so App.tsx's loading screen
// doesn't deadlock waiting for a useStore() consumer that never mounts.
void fetchData(true);

// Re-fetch whenever the user returns to this browser tab so data stays current
// across multiple open tabs or after changes made from another device/session.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void fetchData(false);
    }
  });
}

// ─── Backup functions (used directly by DataManagement.tsx) ───────────────────

export function getBackupSnapshots(): BackupSnapshot[] {
  return sharedBackups;
}

export function saveBackupSnapshot(label?: string): BackupSnapshot {
  const snapshot: BackupSnapshot = {
    timestamp: new Date().toISOString(),
    data: { ...sharedData },
    users: null, // employees live in the shared DB already
    ...(label?.trim() ? { label: label.trim() } : {}),
  };
  sharedBackups = [snapshot, ...sharedBackups].slice(0, MAX_SNAPSHOTS);
  void apiPut("/api/backups", sharedBackups);
  notifyAll();
  return snapshot;
}

export function deleteBackupSnapshot(index: number): boolean {
  if (index < 0 || index >= sharedBackups.length) return false;
  sharedBackups = sharedBackups.filter((_, i) => i !== index);
  void apiPut("/api/backups", sharedBackups);
  notifyAll();
  return true;
}

export function restoreBackupSnapshot(index = 0): boolean {
  const snapshot = sharedBackups[index];
  if (!snapshot) return false;
  sharedData = {
    guards: snapshot.data.guards ?? [],
    schools: snapshot.data.schools ?? [],
    needs: snapshot.data.needs ?? [],
    tickets: snapshot.data.tickets ?? [],
    operations: snapshot.data.operations ?? [],
    violations: snapshot.data.violations ?? [],
  };
  void saveDataToApi(sharedData);
  notifyAll();
  return true;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Subscribe to backup list changes. Use in DataManagement instead of useState. */
export function useBackups(): BackupSnapshot[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);
  return sharedBackups;
}

/** Returns the last save-error message, or null when saves are succeeding. */
export function useSaveError() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);
  return { error: sharedSaveError, dismiss: () => setSaveError(null) };
}

/** Returns true while the initial API fetch is in progress. */
export function useAppLoading() {
  const [loading, setLoading] = useState(sharedLoading);
  useEffect(() => {
    if (!sharedLoading) {
      setLoading(false);
      return;
    }
    const listener = () => setLoading(sharedLoading);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);
  return loading;
}

// ─── Main store hook ──────────────────────────────────────────────────────────

export function useStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    void fetchData(false);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const setData = useCallback((data: AppData) => {
    const prev = sharedData;   // capture for rollback
    sharedData = data;         // optimistic update
    notifyAll();

    persistData(data).catch(() => {
      // Server rejected the write — restore previous state so UI is consistent
      // with what the database actually contains.
      console.warn("[store] Rolling back optimistic update due to save failure");
      sharedData = prev;
      notifyAll();
    });
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

  const upsertTickets = useCallback(
    (tickets: Ticket[]) => {
      const byKey = new Map<string, Ticket>();
      sharedData.tickets.forEach((ticket) => {
        byKey.set(ticket.externalId || ticket.ticketNumber || ticket.id, ticket);
      });
      tickets.forEach((ticket) => {
        const key = ticket.externalId || ticket.ticketNumber || ticket.id;
        const existing = byKey.get(key);
        byKey.set(key, existing ? { ...existing, ...ticket, id: existing.id } : ticket);
      });
      setData({ ...sharedData, tickets: Array.from(byKey.values()) });
    },
    [setData]
  );

  const removeInvalidImportedTickets = useCallback(() => {
    setData({
      ...sharedData,
      tickets: sharedData.tickets.filter((ticket) => {
        if (ticket.source !== "منصة الدعم الموحد") return true;
        const randomImportNumber = /^BLG-[A-Z0-9]{6}$/i.test(ticket.ticketNumber);
        const invalidDate = ticket.ticketDate === "Invalid Date" || Number.isNaN(new Date(ticket.ticketDate).getTime());
        const missingSchool = ticket.schoolName === "غير محدد";
        return !(randomImportNumber || (invalidDate && missingSchool));
      }),
    });
  }, [setData]);

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

  const deleteGuard = useCallback(
    (id: string, op: Operation) =>
      setData({
        ...sharedData,
        guards: sharedData.guards.filter((g) => g.id !== id),
        operations: [op, ...sharedData.operations],
      }),
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
    loading: sharedLoading,
    saving: sharedSaving,
    importData,
    clearData,
    loadDemoData,
    clearDemoData,
    addNeed,
    updateNeedStatus,
    deleteNeed,
    addTicket,
    upsertTickets,
    removeInvalidImportedTickets,
    updateTicket,
    deleteTicket,
    addOperation,
    assignGuard,
    cancelAssignment,
    addGuard,
    deleteGuard,
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

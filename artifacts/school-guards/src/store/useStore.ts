import { useState, useEffect, useCallback } from "react";
import type {
  Guard,
  School,
  Need,
  NeedStatus,
  Ticket,
  TicketStatus,
  Operation,
  AppData,
} from "../types";
import { demoGuards, demoSchools } from "../data/demoData";

const STORAGE_KEY = "school_guards_data";

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { guards: [], schools: [], needs: [], tickets: [], operations: [] };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      guards: parsed.guards ?? [],
      schools: parsed.schools ?? [],
      needs: parsed.needs ?? [],
      tickets: parsed.tickets ?? [],
      operations: parsed.operations ?? [],
    };
  } catch {
    return { guards: [], schools: [], needs: [], tickets: [], operations: [] };
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
      setData({
        ...sharedData,
        needs: sharedData.needs.map((n) => (n.id === id ? { ...n, status } : n)),
      }),
    [setData]
  );

  const deleteNeed = useCallback(
    (id: string) =>
      setData({ ...sharedData, needs: sharedData.needs.filter((n) => n.id !== id) }),
    [setData]
  );

  // ── Tickets ────────────────────────────────────────────────────────────────
  const addTicket = useCallback(
    (ticket: Ticket) =>
      setData({ ...sharedData, tickets: [ticket, ...sharedData.tickets] }),
    [setData]
  );

  const updateTicket = useCallback(
    (id: string, patch: Partial<Ticket>) =>
      setData({
        ...sharedData,
        tickets: sharedData.tickets.map((t) =>
          t.id === id ? { ...t, ...patch } : t
        ),
      }),
    [setData]
  );

  const deleteTicket = useCallback(
    (id: string) =>
      setData({ ...sharedData, tickets: sharedData.tickets.filter((t) => t.id !== id) }),
    [setData]
  );

  // ── Operations ─────────────────────────────────────────────────────────────
  const addOperation = useCallback(
    (op: Operation) =>
      setData({ ...sharedData, operations: [op, ...sharedData.operations] }),
    [setData]
  );

  const addGuard = useCallback(
    (guard: Guard, op: Operation) =>
      setData({
        ...sharedData,
        guards: [guard, ...sharedData.guards],
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

  const hasDemoData =
    sharedData.guards.some((g) => g.isDemo) ||
    sharedData.schools.some((s) => s.isDemo);
  const hasRealData =
    sharedData.guards.some((g) => !g.isDemo) ||
    sharedData.schools.some((s) => !s.isDemo);

  return {
    guards: sharedData.guards,
    schools: sharedData.schools,
    needs: sharedData.needs,
    tickets: sharedData.tickets,
    operations: sharedData.operations,
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
    addGuard,
    updateGuard,
    hasDemoData,
    hasRealData,
    hasData: sharedData.guards.length > 0 || sharedData.schools.length > 0,
  };
}

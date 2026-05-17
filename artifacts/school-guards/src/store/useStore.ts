import { useState, useEffect, useCallback } from "react";
import type { Guard, School, Need, NeedStatus, AppData } from "../types";
import { demoGuards, demoSchools } from "../data/demoData";

const STORAGE_KEY = "school_guards_data";

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { guards: [], schools: [], needs: [] };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      guards: parsed.guards ?? [],
      schools: parsed.schools ?? [],
      needs: parsed.needs ?? [],
    };
  } catch {
    return { guards: [], schools: [], needs: [] };
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

  const importData = useCallback(
    (guards: Guard[], schools: School[]) => {
      const demoGuardItems = sharedData.guards.filter((g) => g.isDemo);
      const demoSchoolItems = sharedData.schools.filter((s) => s.isDemo);
      setData({
        guards: [...demoGuardItems, ...guards],
        schools: [...demoSchoolItems, ...schools],
        needs: sharedData.needs,
      });
    },
    [setData]
  );

  const clearData = useCallback(() => {
    setData({
      guards: sharedData.guards.filter((g) => g.isDemo),
      schools: sharedData.schools.filter((s) => s.isDemo),
      needs: sharedData.needs,
    });
  }, [setData]);

  const loadDemoData = useCallback(() => {
    setData({
      guards: [...demoGuards, ...sharedData.guards.filter((g) => !g.isDemo)],
      schools: [...demoSchools, ...sharedData.schools.filter((s) => !s.isDemo)],
      needs: sharedData.needs,
    });
  }, [setData]);

  const clearDemoData = useCallback(() => {
    setData({
      guards: sharedData.guards.filter((g) => !g.isDemo),
      schools: sharedData.schools.filter((s) => !s.isDemo),
      needs: sharedData.needs,
    });
  }, [setData]);

  const addNeed = useCallback(
    (need: Need) => {
      setData({ ...sharedData, needs: [need, ...sharedData.needs] });
    },
    [setData]
  );

  const updateNeedStatus = useCallback(
    (id: string, status: NeedStatus) => {
      setData({
        ...sharedData,
        needs: sharedData.needs.map((n) => (n.id === id ? { ...n, status } : n)),
      });
    },
    [setData]
  );

  const deleteNeed = useCallback(
    (id: string) => {
      setData({ ...sharedData, needs: sharedData.needs.filter((n) => n.id !== id) });
    },
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
    importData,
    clearData,
    loadDemoData,
    clearDemoData,
    addNeed,
    updateNeedStatus,
    deleteNeed,
    hasDemoData,
    hasRealData,
    hasData: sharedData.guards.length > 0 || sharedData.schools.length > 0,
  };
}

import { useState, useEffect, useCallback } from "react";
import type { Guard, School, AppData } from "../types";
import { demoGuards, demoSchools } from "../data/demoData";

const STORAGE_KEY = "school_guards_data";

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { guards: [], schools: [] };
    return JSON.parse(raw) as AppData;
  } catch {
    return { guards: [], schools: [] };
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
      const demoOnly = {
        guards: sharedData.guards.filter((g) => g.isDemo),
        schools: sharedData.schools.filter((s) => s.isDemo),
      };
      const newData: AppData = {
        guards: [...demoOnly.guards, ...guards],
        schools: [...demoOnly.schools, ...schools],
      };
      setData(newData);
    },
    [setData]
  );

  const clearData = useCallback(() => {
    const demoOnly = {
      guards: sharedData.guards.filter((g) => g.isDemo),
      schools: sharedData.schools.filter((s) => s.isDemo),
    };
    setData(demoOnly);
  }, [setData]);

  const loadDemoData = useCallback(() => {
    const realGuards = sharedData.guards.filter((g) => !g.isDemo);
    const realSchools = sharedData.schools.filter((s) => !s.isDemo);
    setData({
      guards: [...demoGuards, ...realGuards],
      schools: [...demoSchools, ...realSchools],
    });
  }, [setData]);

  const clearDemoData = useCallback(() => {
    setData({
      guards: sharedData.guards.filter((g) => !g.isDemo),
      schools: sharedData.schools.filter((s) => !s.isDemo),
    });
  }, [setData]);

  const hasDemoData =
    sharedData.guards.some((g) => g.isDemo) ||
    sharedData.schools.some((s) => s.isDemo);

  const hasRealData =
    sharedData.guards.some((g) => !g.isDemo) ||
    sharedData.schools.some((s) => !s.isDemo);

  return {
    guards: sharedData.guards,
    schools: sharedData.schools,
    importData,
    clearData,
    loadDemoData,
    clearDemoData,
    hasDemoData,
    hasRealData,
    hasData: sharedData.guards.length > 0 || sharedData.schools.length > 0,
  };
}

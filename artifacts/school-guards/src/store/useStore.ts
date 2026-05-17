import { useState, useEffect, useCallback } from "react";
import type { Guard, School, AppData } from "../types";

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
      const newData: AppData = { guards, schools };
      setData(newData);
    },
    [setData]
  );

  const clearData = useCallback(() => {
    setData({ guards: [], schools: [] });
  }, [setData]);

  return {
    guards: sharedData.guards,
    schools: sharedData.schools,
    importData,
    clearData,
    hasData: sharedData.guards.length > 0 || sharedData.schools.length > 0,
  };
}

import type { Guard } from "../types";

export function isMaleGuard(guard: Guard) {
  return guard.gender === "ذكر";
}

export function buildMaleGuardsBySchool(guards: Guard[]) {
  const guardsBySchool = new Map<string, Guard[]>();

  guards.forEach((guard) => {
    if (!guard.schoolId || !isMaleGuard(guard)) return;

    const list = guardsBySchool.get(guard.schoolId) ?? [];
    list.push(guard);
    guardsBySchool.set(guard.schoolId, list);
  });

  return guardsBySchool;
}

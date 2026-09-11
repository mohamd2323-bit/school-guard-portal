export function governorateKey(value: string | undefined | null) {
  return (value ?? "")
    .trim()
    .replace(/\u0640/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/\s+/g, " ");
}

export function displayGovernorate(value: string | undefined | null) {
  const key = governorateKey(value);
  if (key === "ابها") return "أبها";
  return (value ?? "").trim();
}

export function uniqueGovernorates(values: (string | undefined | null)[]): string[] {
  const byKey = new Map<string, string>();

  values.forEach((value) => {
    const key = governorateKey(value);
    if (!key) return;
    byKey.set(key, displayGovernorate(value));
  });

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "ar"));
}

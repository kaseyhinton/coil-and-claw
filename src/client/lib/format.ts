import type { FeedingInfo } from "../../shared/feeding";

export type LengthUnit = "cm" | "in";

const LENGTH_KEY = "coil-claw:length-unit";

export function getLengthUnit(): LengthUnit {
  try {
    return localStorage.getItem(LENGTH_KEY) === "in" ? "in" : "cm";
  } catch {
    return "cm";
  }
}

export function setLengthUnit(u: LengthUnit) {
  try {
    localStorage.setItem(LENGTH_KEY, u);
  } catch {
    /* ignore */
  }
}

export const cmToUnit = (cm: number, u: LengthUnit) => (u === "in" ? cm / 2.54 : cm);
export const unitToCm = (v: number, u: LengthUnit) => (u === "in" ? v * 2.54 : v);

const trim = (n: number) => String(Math.round(n * 10) / 10);

export function formatLength(cm: number | null, u: LengthUnit) {
  if (cm == null) return "—";
  if (u === "in") {
    const inches = cm / 2.54;
    if (inches >= 24) {
      const ft = Math.floor(inches / 12);
      return `${ft}′ ${Math.round(inches - ft * 12)}″`;
    }
    return `${trim(inches)} in`;
  }
  return cm >= 100 ? `${trim(cm / 100)} m` : `${trim(cm)} cm`;
}

export function formatWeight(g: number | null) {
  if (g == null) return "—";
  // Keepers track grams closely (a 1,482 g python is not "1.5 kg"), so only switch to kg for big animals.
  return g >= 10000 ? `${trim(g / 1000)} kg` : `${Number(trim(g)).toLocaleString()} g`;
}

export function formatAge(birthDate: string | null) {
  if (!birthDate) return null;
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.44 * 86400000));
  if (Number.isNaN(months) || months < 0) return null;
  if (months < 1) return "Under a month";
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  return `${Math.floor(months / 12)} years`;
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function relativeDays(d: string | Date) {
  const start = (x: Date) => new Date(x).setHours(0, 0, 0, 0);
  const days = Math.round((start(new Date()) - start(new Date(d))) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days === -1) return "tomorrow";
  return days > 0 ? `${days} days ago` : `in ${-days} days`;
}

export function feedingLabel(info: FeedingInfo) {
  switch (info.status) {
    case "never":
      return "No feedings yet";
    case "overdue":
      return `Overdue by ${-info.daysUntil!} day${info.daysUntil === -1 ? "" : "s"}`;
    case "due":
      return "Hungry today!";
    case "soon":
      return "Due tomorrow";
    default:
      return `Next meal in ${info.daysUntil} days`;
  }
}

/** Local datetime string for <input type="datetime-local">. */
export function toLocalInput(d = new Date()) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export const preyStateLabel = { live: "Live", frozen_thawed: "Frozen/thawed", pre_killed: "Pre-killed" } as const;

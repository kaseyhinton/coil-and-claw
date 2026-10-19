export type FeedingStatus = "ok" | "soon" | "due" | "overdue" | "never";

const DAY = 24 * 60 * 60 * 1000;

export type FeedingInfo = {
  status: FeedingStatus;
  nextDue: number | null;
  /** Whole days until due (negative = days overdue). */
  daysUntil: number | null;
};

export function feedingInfo(lastFedAt: number | null | undefined, intervalDays: number, now = Date.now()): FeedingInfo {
  if (!lastFedAt) return { status: "never", nextDue: null, daysUntil: null };
  const nextDue = lastFedAt + intervalDays * DAY;
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const startOfDueDay = new Date(nextDue).setHours(0, 0, 0, 0);
  const daysUntil = Math.round((startOfDueDay - startOfToday) / DAY);
  let status: FeedingStatus = "ok";
  if (daysUntil < 0) status = "overdue";
  else if (daysUntil === 0) status = "due";
  else if (daysUntil <= 1) status = "soon";
  return { status, nextDue, daysUntil };
}

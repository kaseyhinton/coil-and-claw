import { useEffect, useMemo } from "react";
import type { Pet } from "../api";
import { feedingInfo, type FeedingInfo } from "../../shared/feeding";

export type PetWithFeeding = Pet & { feeding: FeedingInfo };

export function withFeeding(pets: Pet[]): PetWithFeeding[] {
  return pets.map((p) => ({
    ...p,
    feeding: feedingInfo(p.lastFedAt ? new Date(p.lastFedAt).getTime() : null, p.feedingIntervalDays),
  }));
}

export const needsFood = (p: PetWithFeeding) => p.feeding.status === "due" || p.feeding.status === "overdue";

const SENT_KEY = "coil-claw:notified";

function alreadySent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export async function enableNotifications() {
  if (!notificationsSupported()) return "unsupported" as const;
  return Notification.requestPermission();
}

/**
 * While the app is open, shows a browser notification (at most once per pet per day)
 * and puts a hungry-count in the tab title.
 */
export function useFeedingReminders(pets: PetWithFeeding[] | undefined) {
  const hungry = useMemo(() => (pets ?? []).filter(needsFood), [pets]);

  useEffect(() => {
    document.title = hungry.length ? `(${hungry.length}) Coil & Claw` : "Coil & Claw";
  }, [hungry.length]);

  useEffect(() => {
    if (!hungry.length || !notificationsSupported() || Notification.permission !== "granted") return;
    const today = new Date().toDateString();
    const sent = alreadySent();
    for (const p of hungry) {
      if (sent[p.id] === today) continue;
      const body =
        p.feeding.status === "overdue"
          ? `${p.name}'s meal is ${-p.feeding.daysUntil!} day(s) overdue.`
          : `${p.name} is due for a meal today.`;
      try {
        new Notification("Feeding time! 🍽️", { body, icon: "/icon.svg", tag: `feed-${p.id}` });
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
      sent[p.id] = today;
    }
    try {
      localStorage.setItem(SENT_KEY, JSON.stringify(sent));
    } catch {
      /* ignore */
    }
  }, [hungry]);

  return hungry;
}

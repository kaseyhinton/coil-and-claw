import { useEffect, useState } from "react";

/** Chrome/Edge/Android's install event; not in the DOM typings yet. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "coil-claw:install-dismissed";
/** After "Not now", wait this long before asking again. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

// The browser can fire beforeinstallprompt before React mounts, so catch it as soon as this module loads.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // We show our own bar instead of Chrome's mini-infobar.
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker failed", err));
  });
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone/iPad Safari can install but never fires beforeinstallprompt. iPadOS reports itself as a Mac. */
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Whether to offer installing the app, and how:
 * "prompt" uses the browser's install dialog, "ios" needs Share → Add to Home Screen.
 */
export function useInstallPrompt() {
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(snoozed);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, []);

  const mode = hidden || isStandalone() ? null : deferred ? "prompt" : isIos() ? "ios" : null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    deferred = null; // Each event can only be prompted once.
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "dismissed") dismiss();
    else notify();
    return outcome === "accepted";
  };

  return { mode, install, dismiss };
}

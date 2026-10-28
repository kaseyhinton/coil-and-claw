import { useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import { Download, Share, X } from "lucide-react";
import { SnakeIcon } from "./PetIcons";
import { useInstallPrompt } from "../lib/install";

/** Wait a moment after load so the bar doesn't greet people before the page does. */
const SHOW_DELAY_MS = 4000;

/** A small bar at the bottom of the screen offering to add Coil & Claw to the home screen. */
export function InstallPrompt() {
  const { mode, install, dismiss } = useInstallPrompt();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!mode || !ready) return null;

  return (
    <div
      role="region"
      aria-label="Install Coil & Claw"
      className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="bg-surface border-border mx-auto flex max-w-xl items-center gap-3 rounded-3xl border p-3 pl-4 shadow-lg">
        <SnakeIcon size={40} className="bob shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display leading-tight font-semibold">Install Coil &amp; Claw</p>
          {mode === "ios" ? (
            <p className="text-muted text-sm leading-snug">
              Tap <Share size={14} className="inline -translate-y-0.5" aria-label="Share" /> then{" "}
              <strong>Add to Home Screen</strong>
            </p>
          ) : (
            <p className="text-muted text-sm leading-snug">Open it like an app, right from your home screen.</p>
          )}
        </div>
        {mode === "prompt" && (
          <Button
            size="sm"
            className="shrink-0"
            onPress={async () => {
              if (await install()) toast.success("Installed! Look for the snake on your home screen 🐍");
            }}
          >
            <Download size={16} /> Install
          </Button>
        )}
        <Button isIconOnly size="sm" variant="ghost" aria-label="Not now" className="shrink-0" onPress={dismiss}>
          <X size={18} />
        </Button>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="bg-surface flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-sm">
      <span className="text-accent">{icon}</span>
      <div className="leading-tight">
        <div className="text-muted text-[11px] font-bold tracking-wide uppercase">{label}</div>
        <div className="font-display text-base font-semibold">{value}</div>
      </div>
    </div>
  );
}

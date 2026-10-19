import { Chip } from "@heroui/react";
import { Eye, Lightbulb, ShieldAlert } from "lucide-react";
import { imageUrl, type Checkup } from "../api";
import { formatDate } from "../lib/format";

const statusMeta = {
  great: { label: "Looking great", emoji: "💚", color: "success", ring: "ring-success/30" },
  watch: { label: "Keep an eye on it", emoji: "👀", color: "warning", ring: "ring-warning/30" },
  concern: { label: "Needs attention", emoji: "🩺", color: "danger", ring: "ring-danger/30" },
} as const;

export function CheckupCard({
  checkup,
  showDate = false,
  action,
}: {
  checkup: Checkup;
  showDate?: boolean;
  /** Rendered at the end of the status row, e.g. a delete button. */
  action?: React.ReactNode;
}) {
  const r = checkup.result;
  const meta = statusMeta[r.status] ?? statusMeta.watch;
  return (
    <div className={`bg-surface flex flex-col gap-4 rounded-2xl p-4 shadow-sm ring-2 ${meta.ring}`}>
      <div className="flex items-start gap-3">
        {checkup.photoKey && (
          <img
            src={imageUrl(checkup.photoKey)}
            alt="Check-up"
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color={meta.color} variant="soft">
              {meta.emoji} {meta.label}
            </Chip>
            {showDate && <span className="text-muted text-xs">{formatDate(checkup.createdAt)}</span>}
            {action && <span className="ml-auto">{action}</span>}
          </div>
          <p className="leading-snug">{r.summary}</p>
        </div>
      </div>

      {checkup.question && (
        <p className="bg-default/60 text-muted rounded-xl px-3 py-2 text-sm italic">“{checkup.question}”</p>
      )}

      {r.vetRecommended && (
        <div className="bg-danger-soft text-danger-soft-foreground flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
          <ShieldAlert size={18} /> We'd recommend a visit to an exotic vet.
        </div>
      )}

      {r.observations.length > 0 && <Section icon={<Eye size={16} />} title="What we noticed" items={r.observations} />}
      {r.tips.length > 0 && <Section icon={<Lightbulb size={16} />} title="Care tips" items={r.tips} />}
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-accent mb-1.5 flex items-center gap-1.5 text-sm font-bold">
        {icon} {title}
      </h4>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-accent">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

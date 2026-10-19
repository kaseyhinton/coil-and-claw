import { Chip } from "@heroui/react";
import type { FeedingInfo } from "../../shared/feeding";
import { feedingLabel } from "../lib/format";

const colors = {
  overdue: "danger",
  due: "warning",
  soon: "accent",
  ok: "success",
  never: "default",
} as const;

const emoji = { overdue: "🚨", due: "🍽️", soon: "⏰", ok: "😋", never: "🥚" };

export function FeedingBadge({ info, size = "sm" }: { info: FeedingInfo; size?: "sm" | "md" | "lg" }) {
  return (
    <Chip color={colors[info.status]} variant="soft" size={size}>
      <span aria-hidden>{emoji[info.status]}</span> {feedingLabel(info)}
    </Chip>
  );
}

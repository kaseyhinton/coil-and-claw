import type { SVGProps } from "react";
import type { PetKind } from "../api";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const ink = "#3b2f45";

function Face({ cx, cy, gap = 8, eye = 2.6 }: { cx: number; cy: number; gap?: number; eye?: number }) {
  return (
    <g>
      <circle cx={cx - gap / 2} cy={cy} r={eye} fill={ink} />
      <circle cx={cx + gap / 2} cy={cy} r={eye} fill={ink} />
      <circle cx={cx - gap / 2 + 0.9} cy={cy - 0.9} r={eye * 0.36} fill="#fff" />
      <circle cx={cx + gap / 2 + 0.9} cy={cy - 0.9} r={eye * 0.36} fill="#fff" />
      <ellipse cx={cx - gap / 2 - 2.6} cy={cy + 3.6} rx={2.2} ry={1.3} fill="#ff8fa3" opacity={0.65} />
      <ellipse cx={cx + gap / 2 + 2.6} cy={cy + 3.6} rx={2.2} ry={1.3} fill="#ff8fa3" opacity={0.65} />
      <path
        d={`M${cx - 1.8} ${cy + 3} q1.8 1.8 3.6 0`}
        stroke={ink}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

export function SnakeIcon({ size = 48, ...props }: IconProps) {
  const body = "#8ddbb0";
  const edge = "#4fae84";
  const belly = "#d8f5e4";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <ellipse cx="32" cy="51" rx="22" ry="8.5" fill={body} stroke={edge} strokeWidth="2" />
      <ellipse cx="30" cy="41.5" rx="16" ry="7" fill={body} stroke={edge} strokeWidth="2" />
      <path d="M24 40 C 40 40, 46 30, 38 21" stroke={edge} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M24 40 C 40 40, 46 30, 38 21" stroke={body} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="52" r="1.8" fill={belly} />
      <circle cx="30" cy="54" r="1.8" fill={belly} />
      <circle cx="44" cy="52" r="1.8" fill={belly} />
      <circle cx="24" cy="41" r="1.5" fill={belly} />
      <circle cx="36" cy="42" r="1.5" fill={belly} />
      <path
        d="M37 26 l0 4.5 m0 0 l-1.6 1.8 m1.6 -1.8 l1.6 1.8"
        stroke="#ff6b81"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="37" cy="17.5" rx="11.5" ry="9.5" fill={body} stroke={edge} strokeWidth="2" />
      <Face cx={37} cy={16.5} gap={9} />
    </svg>
  );
}

export function TarantulaIcon({ size = 48, ...props }: IconProps) {
  const body = "#c3a6ea";
  const edge = "#8d6bc6";
  const legs = ["M25 25 Q14 12 7 17", "M24 29 Q11 24 5 31", "M24 33 Q11 35 7 44", "M26 37 Q16 46 15 54"];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <g stroke={edge} strokeWidth="4" strokeLinecap="round" fill="none">
        {legs.map((d) => (
          <path key={d} d={d} />
        ))}
        <g transform="translate(64 0) scale(-1 1)">
          {legs.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <g stroke={body} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9">
        {legs.map((d) => (
          <path key={d} d={d} />
        ))}
        <g transform="translate(64 0) scale(-1 1)">
          {legs.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <circle cx="32" cy="44" r="13" fill={body} stroke={edge} strokeWidth="2" />
      <path
        d="M27 40 q5 -3 10 0 M26 46 q6 -3 12 0"
        stroke={edge}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="32" cy="27" r="10.5" fill={body} stroke={edge} strokeWidth="2" />
      <path d="M26 18 l-1 -3 M32 16.5 l0 -3 M38 18 l1 -3" stroke={edge} strokeWidth="1.6" strokeLinecap="round" />
      <Face cx={32} cy={26} gap={8} />
    </svg>
  );
}

export function LizardIcon({ size = 48, ...props }: IconProps) {
  const body = "#ffc989";
  const edge = "#e3954a";
  const spot = "#c97a3a";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <path
        d="M32 46 C 32 56, 44 60, 48 54 C 51 49, 44 46, 42 50"
        stroke={edge}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 46 C 32 56, 44 60, 48 54 C 51 49, 44 46, 42 50"
        stroke={body}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <g stroke={edge} strokeWidth="4.5" strokeLinecap="round">
        <path d="M26 30 L17 25" />
        <path d="M38 30 L47 25" />
        <path d="M26 42 L17 47" />
        <path d="M38 42 L47 47" />
      </g>
      <g fill={body} stroke={edge} strokeWidth="1.2">
        <circle cx="16" cy="24.5" r="2.6" />
        <circle cx="48" cy="24.5" r="2.6" />
        <circle cx="16" cy="47.5" r="2.6" />
        <circle cx="48" cy="47.5" r="2.6" />
      </g>
      <ellipse cx="32" cy="37" rx="9" ry="12" fill={body} stroke={edge} strokeWidth="2" />
      <circle cx="29" cy="34" r="1.4" fill={spot} />
      <circle cx="35" cy="38" r="1.4" fill={spot} />
      <circle cx="30" cy="42" r="1.4" fill={spot} />
      <ellipse cx="32" cy="18" rx="11" ry="9" fill={body} stroke={edge} strokeWidth="2" />
      <Face cx={32} cy={17} gap={10} eye={2.8} />
    </svg>
  );
}

export function JumpingSpiderIcon({ size = 48, ...props }: IconProps) {
  const body = "#9cc3ee";
  const edge = "#5b8fcc";
  const legs = ["M24 25 Q14 17 9 22", "M23 30 Q12 28 8 34", "M24 34 Q13 38 11 45", "M26 38 Q19 46 18 52"];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <g stroke={edge} strokeWidth="5" strokeLinecap="round" fill="none">
        {legs.map((d) => (
          <path key={d} d={d} />
        ))}
        <g transform="translate(64 0) scale(-1 1)">
          {legs.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <g stroke={body} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9">
        {legs.map((d) => (
          <path key={d} d={d} />
        ))}
        <g transform="translate(64 0) scale(-1 1)">
          {legs.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <ellipse cx="32" cy="47" rx="11" ry="10" fill={body} stroke={edge} strokeWidth="2" />
      <g fill="#fff" opacity="0.85">
        <circle cx="28" cy="47" r="1.8" />
        <circle cx="36" cy="47" r="1.8" />
        <circle cx="32" cy="52.5" r="1.5" />
      </g>
      <ellipse cx="32" cy="28" rx="14" ry="11" fill={body} stroke={edge} strokeWidth="2" />
      <path
        d="M27 17.5 l-1 -2.5 M32 17 l0 -2.6 M37 17.5 l1 -2.5"
        stroke={edge}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="24" r="1.3" fill={ink} />
      <circle cx="42.5" cy="24" r="1.3" fill={ink} />
      <ellipse cx="29.5" cy="35.5" rx="1.8" ry="1.3" fill="#5fd3c4" />
      <ellipse cx="34.5" cy="35.5" rx="1.8" ry="1.3" fill="#5fd3c4" />
      <Face cx={32} cy={27} gap={10.5} eye={4} />
    </svg>
  );
}

export function FrogIcon({ size = 48, ...props }: IconProps) {
  const body = "#b4e07e";
  const edge = "#78b545";
  const belly = "#e8f7cf";
  // Drawn twice (outline, then fill) so the eye bumps and legs merge into one silhouette.
  const shapes = (
    <>
      <ellipse cx="14" cy="50" rx="8" ry="5.5" />
      <ellipse cx="50" cy="50" rx="8" ry="5.5" />
      <circle cx="23" cy="25" r="7.5" />
      <circle cx="41" cy="25" r="7.5" />
      <ellipse cx="32" cy="40" rx="19" ry="15" />
      <ellipse cx="24" cy="55" rx="4.5" ry="3" />
      <ellipse cx="40" cy="55" rx="4.5" ry="3" />
    </>
  );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <g fill={body} stroke={edge} strokeWidth="4">
        {shapes}
      </g>
      <g fill={body}>{shapes}</g>
      <ellipse cx="32" cy="45" rx="11" ry="7.5" fill={belly} />
      <Face cx={32} cy={25} gap={18} eye={3.4} />
    </svg>
  );
}

export function EggIcon({ size = 48, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden {...props}>
      <path
        d="M32 6 C 46 6, 54 28, 54 40 C 54 52, 44 59, 32 59 C 20 59, 10 52, 10 40 C 10 28, 18 6, 32 6 Z"
        fill="#fbeccc"
        stroke="#dcb978"
        strokeWidth="2"
      />
      <path
        d="M11 34 l7 -5 l6 5 l7 -6 l7 6 l6 -5 l7 5 l2 -1"
        stroke="#dcb978"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="17" r="2" fill="#f2d79f" />
      <circle cx="42" cy="22" r="2.5" fill="#f2d79f" />
      <Face cx={32} cy={42} gap={10} eye={2.8} />
    </svg>
  );
}

export function PetKindIcon({ kind, ...props }: IconProps & { kind: PetKind }) {
  switch (kind) {
    case "snake":
      return <SnakeIcon {...props} />;
    case "tarantula":
      return <TarantulaIcon {...props} />;
    case "jumping_spider":
      return <JumpingSpiderIcon {...props} />;
    case "lizard":
      return <LizardIcon {...props} />;
    case "amphibian":
      return <FrogIcon {...props} />;
    default:
      return <EggIcon {...props} />;
  }
}

export const kindMeta: Record<PetKind, { label: string; short: string; plural: string; tint: string }> = {
  snake: { label: "Snake", short: "Snake", plural: "Snakes", tint: "bg-[#e3f7ec] dark:bg-[#1f3a2d]" },
  tarantula: { label: "Tarantula", short: "Tarantula", plural: "Tarantulas", tint: "bg-[#efe6fb] dark:bg-[#33284a]" },
  jumping_spider: {
    label: "Jumping spider",
    short: "Jumper",
    plural: "Jumping spiders",
    tint: "bg-[#e2eefb] dark:bg-[#1f2e44]",
  },
  lizard: { label: "Lizard", short: "Lizard", plural: "Lizards", tint: "bg-[#fff0dc] dark:bg-[#43321e]" },
  amphibian: { label: "Amphibian", short: "Amphibian", plural: "Amphibians", tint: "bg-[#eef8dc] dark:bg-[#2c3a1e]" },
  other: { label: "Something else", short: "Other", plural: "Others", tint: "bg-[#fdf5e3] dark:bg-[#3d3523]" },
};

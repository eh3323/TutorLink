import type { TutorTier } from "@/lib/tutor-tier";
import { TIER_BLURB, TIER_LABEL } from "@/lib/tutor-tier";

const TIER_STYLES: Record<TutorTier, string> = {
  TOP_RATED:
    "border-amber-300/40 bg-gradient-to-r from-amber-300/20 to-rose-300/20 text-amber-100",
  PRO: "border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100",
  VERIFIED: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
  NEW: "border-white/15 bg-white/5 text-slate-200",
};

type Size = "xs" | "sm";

const SIZE_STYLES: Record<Size, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-1 text-[11px]",
};

export function TutorTierBadge({
  tier,
  size = "sm",
  withTitle = true,
}: {
  tier: TutorTier | string;
  size?: Size;
  withTitle?: boolean;
}) {
  const t = (tier as TutorTier) in TIER_LABEL ? (tier as TutorTier) : "NEW";
  return (
    <span
      title={withTitle ? TIER_BLURB[t] : undefined}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${SIZE_STYLES[size]} ${TIER_STYLES[t]}`}
    >
      {t === "TOP_RATED" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
        >
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.77 5.06 16.7l.94-5.49-4-3.9 5.53-.8L10 1.5z" />
        </svg>
      ) : null}
      {TIER_LABEL[t]}
    </span>
  );
}

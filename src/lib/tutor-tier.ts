// tutor reputation tier ladder. higher = more visible in search.
//
// rules of thumb (kept simple; tunable):
//   NEW         every tutor starts here until verified
//   VERIFIED    user-level identity verification approved by admin
//   PRO         verified + ≥10 completed sessions + avg rating ≥4.5 + ≥5 unique tutees
//   TOP_RATED   pro + ≥30 completed sessions + avg ≥4.7 + repeat-rate ≥40%
//
// repeat-rate = (sessions - uniqueTutees) / sessions; basically how often
// people come back. that one number captures supply-side quality better than
// anything else, which is why it's the gate to top-rated.

export const TUTOR_TIERS = ["NEW", "VERIFIED", "PRO", "TOP_RATED"] as const;
export type TutorTier = (typeof TUTOR_TIERS)[number];

export type TutorTierStats = {
  verificationStatus: string | null;
  completedSessions: number;
  averageRating: number | null;
  uniqueTutees: number;
};

export type TutorTierResult = {
  tier: TutorTier;
  score: number;
  repeatRate: number;
};

export function computeTutorTier(stats: TutorTierStats): TutorTierResult {
  const verified = stats.verificationStatus === "VERIFIED";
  const sessions = Math.max(0, stats.completedSessions);
  const unique = Math.max(0, stats.uniqueTutees);
  const avg = stats.averageRating ?? 0;
  const repeatRate = sessions > 0 ? Math.max(0, sessions - unique) / sessions : 0;

  let tier: TutorTier = "NEW";
  if (verified) tier = "VERIFIED";
  if (
    verified &&
    sessions >= 10 &&
    avg >= 4.5 &&
    unique >= 5
  ) {
    tier = "PRO";
  }
  if (
    verified &&
    sessions >= 30 &&
    avg >= 4.7 &&
    repeatRate >= 0.4
  ) {
    tier = "TOP_RATED";
  }

  // ranking score within a tier: smooth function of rating × log(session) × repeat
  const score =
    (avg || 0) * Math.log(sessions + 1) * (1 + repeatRate) +
    (verified ? 0.25 : 0);

  return { tier, score, repeatRate };
}

const TIER_RANK: Record<TutorTier, number> = {
  TOP_RATED: 0,
  PRO: 1,
  VERIFIED: 2,
  NEW: 3,
};

export function compareTutorTier(
  a: { tier: TutorTier; score: number; createdAt?: Date | string },
  b: { tier: TutorTier; score: number; createdAt?: Date | string },
) {
  const da = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (da !== 0) return da;
  if (a.score !== b.score) return b.score - a.score;
  // tiebreak: newer accounts last so stable tutors keep their slots
  const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return bt - at;
}

export const TIER_LABEL: Record<TutorTier, string> = {
  TOP_RATED: "Top Rated",
  PRO: "Pro",
  VERIFIED: "Verified",
  NEW: "New",
};

export const TIER_BLURB: Record<TutorTier, string> = {
  TOP_RATED: "Consistently 4.7+, 30+ sessions, lots of returning students.",
  PRO: "10+ sessions and a 4.5+ average from real students.",
  VERIFIED: "Identity confirmed by TutorLink admins.",
  NEW: "Getting started — say hi and book the first session.",
};

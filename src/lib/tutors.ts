import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { Role, SessionStatus, VerificationStatus } from "@/lib/enums";
import {
  computeTutorTier,
  compareTutorTier,
  type TutorTier,
} from "@/lib/tutor-tier";

const tutorListInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
  tutorProfile: {
    include: {
      subjects: {
        include: {
          subject: true,
        },
      },
    },
  },
  receivedReviews: {
    where: { direction: "TUTEE_TO_TUTOR" },
    select: {
      rating: true,
    },
  },
  tutorSessions: {
    where: { status: SessionStatus.COMPLETED },
    select: { id: true, tuteeId: true },
  },
});

const tutorDetailInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
  tutorProfile: {
    include: {
      subjects: {
        include: {
          subject: true,
        },
      },
    },
  },
  receivedReviews: {
    where: { direction: "TUTEE_TO_TUTOR" },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      session: {
        include: {
          subject: true,
        },
      },
    },
  },
  tutorSessions: {
    where: { status: SessionStatus.COMPLETED },
    select: { id: true, tuteeId: true },
  },
});

type TutorListRecord = Prisma.UserGetPayload<{
  include: typeof tutorListInclude;
}>;

type TutorDetailRecord = Prisma.UserGetPayload<{
  include: typeof tutorDetailInclude;
}>;

type TutorSearchParams = {
  subject?: string;
  minRate?: number;
  maxRate?: number;
  mode?: "online" | "in-person";
  verified?: boolean;
  sort?: "tier" | "rating" | "rate-asc" | "rate-desc" | "newest";
};

function formatSubjectLabel(subject: { department: string; code: string; name: string }) {
  return `${subject.department} ${subject.code} - ${subject.name}`;
}

function calculateAverageRating(reviews: Array<{ rating: number }>) {
  if (reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(2));
}

function formatTutorSummary(user: TutorListRecord) {
  const tutorProfile = user.tutorProfile;

  if (!user.profile || !tutorProfile) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Tutor record is incomplete.");
  }

  const averageRating = calculateAverageRating(user.receivedReviews);
  const completedSessions = user.tutorSessions.length;
  const uniqueTutees = new Set(user.tutorSessions.map((s) => s.tuteeId)).size;
  const tier = computeTutorTier({
    verificationStatus: user.verificationStatus,
    completedSessions,
    averageRating,
    uniqueTutees,
  });

  return {
    id: user.id,
    role: user.role,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
    profile: {
      fullName: user.profile.fullName,
      major: user.profile.major,
      bio: user.profile.bio,
      school: user.profile.school,
      graduationYear: user.profile.graduationYear,
      avatarUrl: user.profile.avatarUrl,
    },
    tutorProfile: {
      headline: tutorProfile.headline,
      hourlyRateCents: tutorProfile.hourlyRateCents,
      supportsOnline: tutorProfile.supportsOnline,
      supportsInPerson: tutorProfile.supportsInPerson,
      defaultLocation: tutorProfile.defaultLocation,
      availabilityNotes: tutorProfile.availabilityNotes,
      verificationStatus: tutorProfile.verificationStatus,
      subjects: tutorProfile.subjects.map(({ proficiencyNote, isPrimary, subject }) => ({
        id: subject.id,
        department: subject.department,
        code: subject.code,
        name: subject.name,
        label: formatSubjectLabel(subject),
        proficiencyNote,
        isPrimary,
      })),
    },
    stats: {
      averageRating,
      reviewCount: user.receivedReviews.length,
      completedSessions,
      uniqueTutees,
      repeatRate: tier.repeatRate,
    },
    tier: tier.tier,
    tierScore: tier.score,
  };
}

function formatTutorDetail(user: TutorDetailRecord) {
  const tutorProfile = user.tutorProfile;

  if (!user.profile || !tutorProfile) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Tutor record is incomplete.");
  }

  const averageRating = calculateAverageRating(user.receivedReviews);
  const completedSessions = user.tutorSessions.length;
  const uniqueTutees = new Set(user.tutorSessions.map((s) => s.tuteeId)).size;
  const tier = computeTutorTier({
    verificationStatus: user.verificationStatus,
    completedSessions,
    averageRating,
    uniqueTutees,
  });

  return {
    id: user.id,
    role: user.role,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
    profile: {
      fullName: user.profile.fullName,
      major: user.profile.major,
      bio: user.profile.bio,
      school: user.profile.school,
      graduationYear: user.profile.graduationYear,
      avatarUrl: user.profile.avatarUrl,
    },
    tutorProfile: {
      headline: tutorProfile.headline,
      hourlyRateCents: tutorProfile.hourlyRateCents,
      supportsOnline: tutorProfile.supportsOnline,
      supportsInPerson: tutorProfile.supportsInPerson,
      defaultLocation: tutorProfile.defaultLocation,
      availabilityNotes: tutorProfile.availabilityNotes,
      verificationStatus: tutorProfile.verificationStatus,
      subjects: tutorProfile.subjects.map(({ proficiencyNote, isPrimary, subject }) => ({
        id: subject.id,
        department: subject.department,
        code: subject.code,
        name: subject.name,
        label: formatSubjectLabel(subject),
        proficiencyNote,
        isPrimary,
      })),
    },
    stats: {
      averageRating,
      reviewCount: user.receivedReviews.length,
      completedSessions,
      uniqueTutees,
      repeatRate: tier.repeatRate,
    },
    tier: tier.tier,
    tierScore: tier.score,
    recentReviews: user.receivedReviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      isVerified: review.isVerified,
      reply: review.reply,
      replyAt: review.replyAt,
      author: {
        id: review.author.id,
        fullName: review.author.profile?.fullName ?? "Anonymous",
        avatarUrl: review.author.profile?.avatarUrl ?? null,
      },
      subject:
        review.session?.subject == null
          ? null
          : {
              id: review.session.subject.id,
              department: review.session.subject.department,
              code: review.session.subject.code,
              name: review.session.subject.name,
              label: formatSubjectLabel(review.session.subject),
            },
    })),
  };
}

export function parseTutorSearchParams(searchParams: URLSearchParams): TutorSearchParams {
  const subject = searchParams.get("subject")?.trim() || undefined;
  const minRateRaw = searchParams.get("minRate");
  const maxRateRaw = searchParams.get("maxRate");
  const modeRaw = searchParams.get("mode");
  const verifiedRaw = searchParams.get("verified");

  const minRate =
    minRateRaw == null || minRateRaw === "" ? undefined : Number.parseInt(minRateRaw, 10);
  const maxRate =
    maxRateRaw == null || maxRateRaw === "" ? undefined : Number.parseInt(maxRateRaw, 10);

  if (minRateRaw && Number.isNaN(minRate)) {
    throw new ApiError(400, "INVALID_INPUT", "minRate must be an integer.");
  }

  if (maxRateRaw && Number.isNaN(maxRate)) {
    throw new ApiError(400, "INVALID_INPUT", "maxRate must be an integer.");
  }

  if (minRate != null && minRate < 0) {
    throw new ApiError(400, "INVALID_INPUT", "minRate must be at least 0.");
  }

  if (maxRate != null && maxRate < 0) {
    throw new ApiError(400, "INVALID_INPUT", "maxRate must be at least 0.");
  }

  if (minRate != null && maxRate != null && minRate > maxRate) {
    throw new ApiError(400, "INVALID_INPUT", "minRate cannot be greater than maxRate.");
  }

  let mode: TutorSearchParams["mode"];
  if (modeRaw) {
    if (modeRaw !== "online" && modeRaw !== "in-person") {
      throw new ApiError(400, "INVALID_INPUT", "mode must be online or in-person.");
    }

    mode = modeRaw;
  }

  let verified: boolean | undefined;
  if (verifiedRaw != null) {
    if (verifiedRaw === "true") {
      verified = true;
    } else if (verifiedRaw === "false") {
      verified = false;
    } else {
      throw new ApiError(400, "INVALID_INPUT", "verified must be true or false.");
    }
  }

  const sortRaw = searchParams.get("sort")?.trim();
  let sort: TutorSearchParams["sort"];
  if (sortRaw) {
    const allowed = new Set(["tier", "rating", "rate-asc", "rate-desc", "newest"]);
    if (!allowed.has(sortRaw)) {
      throw new ApiError(400, "INVALID_INPUT", "sort is not a recognised value.");
    }
    sort = sortRaw as TutorSearchParams["sort"];
  }

  return {
    subject,
    minRate,
    maxRate,
    mode,
    verified,
    sort,
  };
}

export async function listTutors(searchParams: TutorSearchParams) {
  const tutors = await db.user.findMany({
    where: {
      role: {
        in: [Role.TUTOR, Role.BOTH],
      },
      profile: {
        isNot: null,
      },
      ...(searchParams.verified === true
        ? { verificationStatus: VerificationStatus.VERIFIED }
        : {}),
      ...(searchParams.verified === false
        ? { verificationStatus: { not: VerificationStatus.VERIFIED } }
        : {}),
      tutorProfile: {
        is: {
          ...(searchParams.minRate != null ? { hourlyRateCents: { gte: searchParams.minRate } } : {}),
          ...(searchParams.maxRate != null ? { hourlyRateCents: { lte: searchParams.maxRate } } : {}),
          ...(searchParams.mode === "online" ? { supportsOnline: true } : {}),
          ...(searchParams.mode === "in-person" ? { supportsInPerson: true } : {}),
          ...(searchParams.subject
            ? {
                subjects: {
                  some: {
                    subject: {
                      OR: [
                        {
                          department: {
                            contains: searchParams.subject,
                          },
                        },
                        {
                          code: {
                            contains: searchParams.subject,
                          },
                        },
                        {
                          name: {
                            contains: searchParams.subject,
                          },
                        },
                      ],
                    },
                  },
                },
              }
            : {}),
        },
      },
    },
    include: tutorListInclude,
    // db-side ordering only matters as a tiebreak; final ordering happens in
    // memory once we've computed the tier/score for every tutor
    orderBy: [{ createdAt: "desc" }],
  });

  const formatted = tutors.map(formatTutorSummary);
  const sortKey = searchParams.sort ?? "tier";

  switch (sortKey) {
    case "rating":
      formatted.sort((a, b) => (b.stats.averageRating ?? 0) - (a.stats.averageRating ?? 0));
      break;
    case "rate-asc":
      formatted.sort(
        (a, b) =>
          (a.tutorProfile.hourlyRateCents ?? Number.POSITIVE_INFINITY) -
          (b.tutorProfile.hourlyRateCents ?? Number.POSITIVE_INFINITY),
      );
      break;
    case "rate-desc":
      formatted.sort(
        (a, b) =>
          (b.tutorProfile.hourlyRateCents ?? -1) -
          (a.tutorProfile.hourlyRateCents ?? -1),
      );
      break;
    case "newest":
      formatted.sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() -
          new Date(a.createdAt as Date).getTime(),
      );
      break;
    case "tier":
    default:
      formatted.sort((a, b) =>
        compareTutorTier(
          { tier: a.tier as TutorTier, score: a.tierScore, createdAt: a.createdAt },
          { tier: b.tier as TutorTier, score: b.tierScore, createdAt: b.createdAt },
        ),
      );
      break;
  }

  return {
    tutors: formatted,
    filters: {
      subject: searchParams.subject ?? null,
      minRate: searchParams.minRate ?? null,
      maxRate: searchParams.maxRate ?? null,
      mode: searchParams.mode ?? null,
      verified: searchParams.verified ?? null,
      sort: searchParams.sort ?? "tier",
    },
    total: formatted.length,
  };
}

export async function getTutorDetail(tutorId: string) {
  const tutor = await db.user.findFirst({
    where: {
      id: tutorId,
      role: {
        in: [Role.TUTOR, Role.BOTH],
      },
      profile: {
        isNot: null,
      },
      tutorProfile: {
        isNot: null,
      },
    },
    include: tutorDetailInclude,
  });

  if (!tutor) {
    throw new ApiError(404, "USER_NOT_FOUND", "Tutor was not found.");
  }

  return formatTutorDetail(tutor);
}

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { SessionStatus } from "@/lib/enums";
import { SessionUser } from "@/lib/permissions";

const reviewInclude = Prisma.validator<Prisma.ReviewInclude>()({
  author: {
    include: {
      profile: true,
    },
  },
  reviewee: {
    include: {
      profile: true,
    },
  },
  session: {
    include: {
      subject: true,
    },
  },
});

type ReviewRecord = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

type ReviewCriteria = {
  punctuality?: number | null;
  preparation?: number | null;
  communication?: number | null;
  helpfulness?: number | null; // tutee → tutor only
  respectful?: number | null;  // tutor → tutee only
};

type CreateReviewInput = {
  sessionId: string;
  rating: number;
  comment?: string | null;
  criteria?: ReviewCriteria | null;
};

type UpdateReplyInput = {
  reviewId: string;
  reply: string | null;
};

type ReviewSearchParams = {
  revieweeId?: string;
  authorId?: string;
  sessionId?: string;
  mine?: boolean;
};

function formatSubjectLabel(subject: { department: string; code: string; name: string }) {
  return `${subject.department} ${subject.code} - ${subject.name}`;
}

function formatParticipant(user: {
  id: string;
  email: string;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    major: string | null;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.profile?.fullName ?? user.email,
    avatarUrl: user.profile?.avatarUrl ?? null,
    major: user.profile?.major ?? null,
  };
}

export function formatReview(review: ReviewRecord) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    direction: review.direction,
    isVerified: review.isVerified,
    criteria: {
      punctuality: review.ratingPunctuality,
      preparation: review.ratingPreparation,
      communication: review.ratingCommunication,
      helpfulness: review.ratingHelpfulness,
      respectful: review.ratingRespectful,
    },
    reply: review.reply,
    replyAt: review.replyAt,
    author: formatParticipant(review.author),
    reviewee: formatParticipant(review.reviewee),
    session: {
      id: review.session.id,
      status: review.session.status,
      scheduledAt: review.session.scheduledAt,
      subject: {
        id: review.session.subject.id,
        department: review.session.subject.department,
        code: review.session.subject.code,
        name: review.session.subject.name,
        label: formatSubjectLabel(review.session.subject),
      },
    },
  };
}

export function parseReviewSearchParams(searchParams: URLSearchParams): ReviewSearchParams {
  const revieweeId = searchParams.get("revieweeId")?.trim() || undefined;
  const authorId = searchParams.get("authorId")?.trim() || undefined;
  const sessionId = searchParams.get("sessionId")?.trim() || undefined;
  const mineRaw = searchParams.get("mine");

  let mine: boolean | undefined;
  if (mineRaw != null) {
    if (mineRaw === "true") {
      mine = true;
    } else if (mineRaw === "false") {
      mine = false;
    } else {
      throw new ApiError(400, "INVALID_INPUT", "mine must be true or false.");
    }
  }

  return {
    revieweeId,
    authorId,
    sessionId,
    mine,
  };
}

export async function createReview(sessionUser: SessionUser, input: CreateReviewInput) {
  const session = await db.session.findUnique({
    where: { id: input.sessionId },
    include: {
      subject: true,
      tutor: {
        include: {
          profile: true,
        },
      },
      tutee: {
        include: {
          profile: true,
        },
      },
      reviews: {
        where: {
          authorId: sessionUser.id,
        },
      },
    },
  });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  }

  const isTutor = sessionUser.id === session.tutorId;
  const isTutee = sessionUser.id === session.tuteeId;

  if (!isTutor && !isTutee) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You must be a participant in this session to leave a review.",
    );
  }

  if (session.status !== SessionStatus.COMPLETED) {
    throw new ApiError(
      400,
      "SESSION_NOT_COMPLETED",
      "Reviews can only be created for completed sessions.",
    );
  }

  if (session.reviews.length > 0) {
    throw new ApiError(
      409,
      "REVIEW_ALREADY_EXISTS",
      "You have already reviewed this session.",
    );
  }

  const revieweeId = isTutor ? session.tuteeId : session.tutorId;

  if (revieweeId === sessionUser.id) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "You cannot review yourself.",
    );
  }

  const direction = isTutor ? "TUTOR_TO_TUTEE" : "TUTEE_TO_TUTOR";
  const c = input.criteria ?? {};
  // sanity-check criteria: if present, must be 1-5; ignore the wrong-side ones
  function clamp(v: number | null | undefined): number | null {
    if (v == null) return null;
    if (!Number.isFinite(v)) return null;
    const n = Math.round(v);
    if (n < 1 || n > 5) return null;
    return n;
  }
  const ratingPunctuality = clamp(c.punctuality);
  const ratingPreparation = clamp(c.preparation);
  const ratingCommunication = clamp(c.communication);
  const ratingHelpfulness =
    direction === "TUTEE_TO_TUTOR" ? clamp(c.helpfulness) : null;
  const ratingRespectful =
    direction === "TUTOR_TO_TUTEE" ? clamp(c.respectful) : null;

  const review = await db.review.create({
    data: {
      sessionId: session.id,
      authorId: sessionUser.id,
      revieweeId,
      rating: input.rating,
      comment: input.comment ?? null,
      direction,
      isVerified: true,
      ratingPunctuality,
      ratingPreparation,
      ratingCommunication,
      ratingHelpfulness,
      ratingRespectful,
    },
    include: reviewInclude,
  });

  return formatReview(review);
}

export async function setReviewReply(
  sessionUser: SessionUser,
  input: UpdateReplyInput,
) {
  const review = await db.review.findUnique({
    where: { id: input.reviewId },
    include: reviewInclude,
  });
  if (!review) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Review was not found.");
  }
  if (review.revieweeId !== sessionUser.id) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Only the person being reviewed can reply.",
    );
  }
  if (review.reply && input.reply !== null) {
    // already replied; can only clear it (admin action) or keep as-is
    throw new ApiError(
      409,
      "REPLY_ALREADY_EXISTS",
      "You already replied to this review.",
    );
  }

  const trimmed = input.reply?.trim() || null;
  if (trimmed && trimmed.length > 1000) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "Reply must be 1000 characters or fewer.",
    );
  }

  const updated = await db.review.update({
    where: { id: review.id },
    data: {
      reply: trimmed,
      replyAt: trimmed ? new Date() : null,
    },
    include: reviewInclude,
  });
  return formatReview(updated);
}

export async function listReviews(searchParams: ReviewSearchParams, sessionUserId?: string) {
  if (searchParams.mine && !sessionUserId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "You must be signed in to query your own reviews.",
    );
  }

  const reviews = await db.review.findMany({
    where: {
      ...(searchParams.sessionId ? { sessionId: searchParams.sessionId } : {}),
      ...(searchParams.authorId ? { authorId: searchParams.authorId } : {}),
      ...(searchParams.revieweeId ? { revieweeId: searchParams.revieweeId } : {}),
      ...(searchParams.mine && sessionUserId
        ? {
            OR: [{ authorId: sessionUserId }, { revieweeId: sessionUserId }],
          }
        : {}),
    },
    include: reviewInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return {
    reviews: reviews.map(formatReview),
    filters: {
      revieweeId: searchParams.revieweeId ?? null,
      authorId: searchParams.authorId ?? null,
      sessionId: searchParams.sessionId ?? null,
      mine: searchParams.mine ?? null,
    },
    total: reviews.length,
  };
}

export async function getReviewDetail(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });

  if (!review) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Review was not found.");
  }

  return formatReview(review);
}

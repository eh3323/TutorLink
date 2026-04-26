import { Prisma, SessionStatus } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
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

type CreateReviewInput = {
  sessionId: string;
  rating: number;
  comment?: string | null;
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

  const review = await db.review.create({
    data: {
      sessionId: session.id,
      authorId: sessionUser.id,
      revieweeId,
      rating: input.rating,
      comment: input.comment ?? null,
    },
    include: reviewInclude,
  });

  return formatReview(review);
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

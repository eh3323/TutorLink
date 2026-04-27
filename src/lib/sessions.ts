import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { DeliveryMode, Role, SessionStatus } from "@/lib/enums";
import { canActAsTutee, canActAsTutor, SessionUser } from "@/lib/permissions";

const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
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
  subject: true,
  thread: {
    include: {
      request: {
        include: {
          subject: true,
        },
      },
    },
  },
  request: {
    include: {
      subject: true,
    },
  },
});

type SessionRecord = Prisma.SessionGetPayload<{
  include: typeof sessionInclude;
}>;

type CreateSessionInput = {
  tutorId: string;
  tuteeId: string;
  subjectId: string;
  threadId?: string;
  requestId?: string;
  scheduledAt: Date;
  durationMinutes: number;
  mode: DeliveryMode;
  locationText?: string | null;
  agreedRateCents?: number | null;
  notes?: string | null;
};

type UpdateSessionInput = {
  status?: SessionStatus;
  scheduledAt?: Date;
  durationMinutes?: number;
  mode?: DeliveryMode;
  locationText?: string | null;
  agreedRateCents?: number | null;
  notes?: string | null;
};

const TRANSITIONS: Record<string, string[]> = {
  PENDING: [SessionStatus.PENDING, SessionStatus.CONFIRMED, SessionStatus.CANCELLED],
  CONFIRMED: [
    SessionStatus.CONFIRMED,
    SessionStatus.COMPLETED,
    SessionStatus.CANCELLED,
  ],
  COMPLETED: [SessionStatus.COMPLETED],
  CANCELLED: [SessionStatus.CANCELLED],
};

function hasTutorRole(role: string | null) {
  return role === Role.TUTOR || role === Role.BOTH;
}

function hasTuteeRole(role: string | null) {
  return role === Role.TUTEE || role === Role.BOTH;
}

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

function assertParticipantAccess(sessionUser: SessionUser, tutorId: string, tuteeId: string) {
  const isTutorSide = sessionUser.id === tutorId;
  const isTuteeSide = sessionUser.id === tuteeId;

  if (!isTutorSide && !isTuteeSide) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You must be a participant in this session.",
    );
  }

  if (isTutorSide && !canActAsTutor(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot act as the tutor side of this session.",
    );
  }

  if (isTuteeSide && !canActAsTutee(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot act as the tutee side of this session.",
    );
  }
}

function formatSession(session: SessionRecord) {
  return {
    id: session.id,
    status: session.status,
    scheduledAt: session.scheduledAt,
    durationMinutes: session.durationMinutes,
    mode: session.mode,
    locationText: session.locationText,
    agreedRateCents: session.agreedRateCents,
    notes: session.notes,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    participants: {
      tutor: formatParticipant(session.tutor),
      tutee: formatParticipant(session.tutee),
    },
    subject: {
      id: session.subject.id,
      department: session.subject.department,
      code: session.subject.code,
      name: session.subject.name,
      label: formatSubjectLabel(session.subject),
    },
    thread:
      session.thread == null
        ? null
        : {
            id: session.thread.id,
            requestId: session.thread.requestId,
          },
    request:
      session.request == null
        ? null
        : {
            id: session.request.id,
            title: session.request.title,
            status: session.request.status,
            subject: {
              id: session.request.subject.id,
              department: session.request.subject.department,
              code: session.request.subject.code,
              name: session.request.subject.name,
              label: formatSubjectLabel(session.request.subject),
            },
          },
  };
}

function ensureAllowedTransition(current: string, next: string) {
  const allowed = TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new ApiError(
      400,
      "INVALID_SESSION_STATUS_TRANSITION",
      `Cannot change session status from ${current} to ${next}.`,
    );
  }
}

export async function createSession(sessionUser: SessionUser, input: CreateSessionInput) {
  if (input.tutorId === input.tuteeId) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "tutorId and tuteeId must be different users.",
    );
  }

  assertParticipantAccess(sessionUser, input.tutorId, input.tuteeId);

  const [tutorUser, tuteeUser, subject, thread, request] = await Promise.all([
    db.user.findUnique({
      where: { id: input.tutorId },
      include: {
        tutorProfile: true,
      },
    }),
    db.user.findUnique({
      where: { id: input.tuteeId },
      include: {
        tuteeProfile: true,
      },
    }),
    db.subject.findUnique({
      where: { id: input.subjectId },
    }),
    input.threadId
      ? db.messageThread.findUnique({
          where: { id: input.threadId },
        })
      : Promise.resolve(null),
    input.requestId
      ? db.tutoringRequest.findUnique({
          where: { id: input.requestId },
        })
      : Promise.resolve(null),
  ]);

  if (!tutorUser || !hasTutorRole(tutorUser.role) || !tutorUser.tutorProfile) {
    throw new ApiError(404, "USER_NOT_FOUND", "Tutor participant was not found.");
  }

  if (!tuteeUser || !hasTuteeRole(tuteeUser.role) || !tuteeUser.tuteeProfile) {
    throw new ApiError(404, "USER_NOT_FOUND", "Tutee participant was not found.");
  }

  if (!subject) {
    throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found.");
  }

  if (input.threadId) {
    if (!thread) {
      throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
    }

    if (thread.tutorId !== input.tutorId || thread.tuteeId !== input.tuteeId) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "threadId does not match the provided tutorId and tuteeId.",
      );
    }
  }

  if (input.requestId) {
    if (!request) {
      throw new ApiError(404, "REQUEST_NOT_FOUND", "Tutoring request was not found.");
    }

    if (request.tuteeId !== input.tuteeId) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "requestId does not belong to the provided tuteeId.",
      );
    }

    if (request.subjectId !== input.subjectId) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "requestId does not match the provided subjectId.",
      );
    }
  }

  if (thread?.requestId && input.requestId && thread.requestId !== input.requestId) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "threadId and requestId do not refer to the same request.",
    );
  }

  if (thread?.requestId && request == null && input.requestId == null) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "requestId is required when the thread is already linked to a request.",
    );
  }

  const createdSession = await db.session.create({
    data: {
      tutorId: input.tutorId,
      tuteeId: input.tuteeId,
      subjectId: input.subjectId,
      threadId: input.threadId ?? null,
      requestId: input.requestId ?? null,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      mode: input.mode,
      locationText: input.locationText ?? null,
      agreedRateCents: input.agreedRateCents ?? null,
      notes: input.notes ?? null,
    },
    include: sessionInclude,
  });

  return formatSession(createdSession);
}

export async function listSessionsForUser(sessionUser: SessionUser) {
  const sessions = await db.session.findMany({
    where: {
      OR: [{ tutorId: sessionUser.id }, { tuteeId: sessionUser.id }],
    },
    include: sessionInclude,
    orderBy: { scheduledAt: "desc" },
  });

  return sessions.map((session) => {
    const base = formatSession(session);
    const viewerRole = session.tutorId === sessionUser.id ? "TUTOR" : "TUTEE";
    const counterpart =
      viewerRole === "TUTOR" ? base.participants.tutee : base.participants.tutor;
    return {
      ...base,
      viewerRole,
      counterpart,
    };
  });
}

export async function getSessionDetailForUser(sessionUser: SessionUser, sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      ...sessionInclude,
      reviews: {
        include: {
          author: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  }

  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  const base = formatSession(session);
  const viewerRole = session.tutorId === sessionUser.id ? "TUTOR" : "TUTEE";
  const counterpart =
    viewerRole === "TUTOR" ? base.participants.tutee : base.participants.tutor;

  return {
    ...base,
    viewerRole,
    counterpart,
    reviews: session.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      author: {
        id: review.author.id,
        fullName: review.author.profile?.fullName ?? review.author.email,
        avatarUrl: review.author.profile?.avatarUrl ?? null,
      },
      authorIsMe: review.authorId === sessionUser.id,
    })),
  };
}

export async function updateSession(
  sessionUser: SessionUser,
  sessionId: string,
  input: UpdateSessionInput,
) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  }

  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  const nextStatus = input.status ?? session.status;
  ensureAllowedTransition(session.status, nextStatus);

  if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) {
    const hasNonStatusUpdates =
      input.scheduledAt !== undefined ||
      input.durationMinutes !== undefined ||
      input.mode !== undefined ||
      input.locationText !== undefined ||
      input.agreedRateCents !== undefined ||
      input.notes !== undefined;

    if (hasNonStatusUpdates) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Completed or cancelled sessions cannot be edited.",
      );
    }
  }

  const updatedSession = await db.session.update({
    where: { id: session.id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.durationMinutes != null
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.locationText !== undefined ? { locationText: input.locationText } : {}),
      ...(input.agreedRateCents !== undefined
        ? { agreedRateCents: input.agreedRateCents }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: sessionInclude,
  });

  return formatSession(updatedSession);
}

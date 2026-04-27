import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { DeliveryMode, Role, SessionStatus } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { canActAsTutee, canActAsTutor, SessionUser } from "@/lib/permissions";

const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  tutor: { include: { profile: true } },
  tutee: { include: { profile: true } },
  subject: true,
  thread: {
    include: {
      request: { include: { subject: true } },
    },
  },
  request: { include: { subject: true } },
});

type SessionRecord = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

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
  profile: { fullName: string; avatarUrl: string | null; major: string | null } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.profile?.fullName ?? user.email,
    avatarUrl: user.profile?.avatarUrl ?? null,
    major: user.profile?.major ?? null,
  };
}

function assertParticipantAccess(
  sessionUser: SessionUser,
  tutorId: string,
  tuteeId: string,
) {
  const isTutorSide = sessionUser.id === tutorId;
  const isTuteeSide = sessionUser.id === tuteeId;
  if (!isTutorSide && !isTuteeSide) {
    throw new ApiError(403, "FORBIDDEN", "You must be a participant in this session.");
  }
  if (isTutorSide && !canActAsTutor(sessionUser.role)) {
    throw new ApiError(403, "FORBIDDEN", "Your account cannot act as the tutor side of this session.");
  }
  if (isTuteeSide && !canActAsTutee(sessionUser.role)) {
    throw new ApiError(403, "FORBIDDEN", "Your account cannot act as the tutee side of this session.");
  }
}

function endOf(scheduledAt: Date, durationMinutes: number) {
  return new Date(scheduledAt.getTime() + durationMinutes * 60_000);
}

// look for a confirmed session that overlaps the proposed window for this user
async function findConflict(
  userId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeSessionId?: string,
) {
  const start = scheduledAt;
  const end = endOf(scheduledAt, durationMinutes);
  const candidates = await db.session.findMany({
    where: {
      OR: [{ tutorId: userId }, { tuteeId: userId }],
      status: SessionStatus.CONFIRMED,
      ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
    },
    include: { subject: true },
  });

  for (const c of candidates) {
    const cStart = c.scheduledAt;
    const cEnd = endOf(c.scheduledAt, c.durationMinutes);
    if (cStart < end && cEnd > start) {
      return c;
    }
  }
  return null;
}

function describeConflict(c: { scheduledAt: Date; durationMinutes: number; subject: { department: string; code: string } }) {
  return `${c.subject.department} ${c.subject.code} at ${formatDateTime(c.scheduledAt)} (${c.durationMinutes}m)`;
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
    proposedById: session.proposedById,
    cancelledById: session.cancelledById,
    cancelledAt: session.cancelledAt,
    cancellationReason: session.cancellationReason,
    roomToken: session.roomToken,
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
        : { id: session.thread.id, requestId: session.thread.requestId },
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

// drop a system-style note inside the thread so both sides see what happened
async function postThreadNote(threadId: string | null, senderId: string, body: string) {
  if (!threadId) return;
  try {
    await db.message.create({
      data: { threadId, senderId, body },
    });
    await db.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });
  } catch {
    // thread might be gone; not fatal
  }
}

export async function createSession(sessionUser: SessionUser, input: CreateSessionInput) {
  if (input.tutorId === input.tuteeId) {
    throw new ApiError(400, "INVALID_INPUT", "tutorId and tuteeId must be different users.");
  }
  assertParticipantAccess(sessionUser, input.tutorId, input.tuteeId);

  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new ApiError(400, "INVALID_INPUT", "Pick a session time in the future.");
  }

  const [tutorUser, tuteeUser, subject, thread, request] = await Promise.all([
    db.user.findUnique({ where: { id: input.tutorId }, include: { tutorProfile: true } }),
    db.user.findUnique({ where: { id: input.tuteeId }, include: { tuteeProfile: true } }),
    db.subject.findUnique({ where: { id: input.subjectId } }),
    input.threadId ? db.messageThread.findUnique({ where: { id: input.threadId } }) : Promise.resolve(null),
    input.requestId ? db.tutoringRequest.findUnique({ where: { id: input.requestId } }) : Promise.resolve(null),
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
    if (!thread) throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
    if (thread.tutorId !== input.tutorId || thread.tuteeId !== input.tuteeId) {
      throw new ApiError(400, "INVALID_INPUT", "threadId does not match the participants.");
    }
  }
  if (input.requestId) {
    if (!request) throw new ApiError(404, "REQUEST_NOT_FOUND", "Tutoring request was not found.");
    if (request.tuteeId !== input.tuteeId) {
      throw new ApiError(400, "INVALID_INPUT", "requestId does not belong to the tutee.");
    }
    if (request.subjectId !== input.subjectId) {
      throw new ApiError(400, "INVALID_INPUT", "requestId does not match the subject.");
    }
  }
  if (thread?.requestId && input.requestId && thread.requestId !== input.requestId) {
    throw new ApiError(400, "INVALID_INPUT", "threadId and requestId disagree.");
  }

  // proposer can't double-book themselves
  const myConflict = await findConflict(sessionUser.id, input.scheduledAt, input.durationMinutes);
  if (myConflict) {
    throw new ApiError(
      409,
      "SESSION_CONFLICT",
      `You already have a confirmed session that overlaps: ${describeConflict(myConflict)}`,
    );
  }

  const created = await db.session.create({
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
      status: SessionStatus.PENDING,
      proposedById: sessionUser.id,
    },
    include: sessionInclude,
  });

  const when = formatDateTime(input.scheduledAt);
  await postThreadNote(
    created.threadId,
    sessionUser.id,
    `proposed a session — ${subject.department} ${subject.code} on ${when}, ${input.durationMinutes} min. waiting for the other side to accept.`,
  );

  return formatSession(created);
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
    const viewerIsProposer = session.proposedById === sessionUser.id;
    return { ...base, viewerRole, counterpart, viewerIsProposer };
  });
}

export async function getSessionDetailForUser(sessionUser: SessionUser, sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      ...sessionInclude,
      reviews: {
        include: {
          author: { include: { profile: true } },
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
  const viewerIsProposer = session.proposedById === sessionUser.id;

  return {
    ...base,
    viewerRole,
    counterpart,
    viewerIsProposer,
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

export async function acceptSession(sessionUser: SessionUser, sessionId: string) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  if (session.proposedById === sessionUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Only the other side can accept your proposal.");
  }
  if (session.status !== SessionStatus.PENDING) {
    throw new ApiError(400, "INVALID_STATE", `Cannot accept a ${session.status.toLowerCase()} session.`);
  }
  if (session.scheduledAt.getTime() <= Date.now()) {
    throw new ApiError(400, "INVALID_STATE", "This session's scheduled time already passed.");
  }

  // both sides must be free
  for (const uid of [session.tutorId, session.tuteeId]) {
    const conflict = await findConflict(uid, session.scheduledAt, session.durationMinutes, session.id);
    if (conflict) {
      const who = uid === sessionUser.id ? "you" : "the other side";
      throw new ApiError(
        409,
        "SESSION_CONFLICT",
        `${who} already have a confirmed session at that time: ${describeConflict(conflict)}`,
      );
    }
  }

  const updated = await db.session.update({
    where: { id: session.id },
    data: { status: SessionStatus.CONFIRMED },
    include: sessionInclude,
  });

  await postThreadNote(
    updated.threadId,
    sessionUser.id,
    `accepted the session — ${updated.subject.department} ${updated.subject.code} on ${formatDateTime(updated.scheduledAt)}. it's locked in.`,
  );

  return formatSession(updated);
}

export async function declineSession(
  sessionUser: SessionUser,
  sessionId: string,
  reason: string | null,
) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  if (session.proposedById === sessionUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Use cancel for your own proposal.");
  }
  if (session.status !== SessionStatus.PENDING) {
    throw new ApiError(400, "INVALID_STATE", `Cannot decline a ${session.status.toLowerCase()} session.`);
  }

  const updated = await db.session.update({
    where: { id: session.id },
    data: {
      status: SessionStatus.CANCELLED,
      cancelledById: sessionUser.id,
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
    },
    include: sessionInclude,
  });

  await postThreadNote(
    updated.threadId,
    sessionUser.id,
    `declined the session proposal${reason ? ` — ${reason}` : ""}.`,
  );

  return formatSession(updated);
}

export async function cancelSession(
  sessionUser: SessionUser,
  sessionId: string,
  reason: string | null,
) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  if (
    session.status === SessionStatus.CANCELLED ||
    session.status === SessionStatus.COMPLETED
  ) {
    throw new ApiError(400, "INVALID_STATE", `Session is already ${session.status.toLowerCase()}.`);
  }

  const updated = await db.session.update({
    where: { id: session.id },
    data: {
      status: SessionStatus.CANCELLED,
      cancelledById: sessionUser.id,
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
    },
    include: sessionInclude,
  });

  await postThreadNote(
    updated.threadId,
    sessionUser.id,
    `cancelled the session${reason ? ` — ${reason}` : ""}.`,
  );

  return formatSession(updated);
}

export async function updateSession(
  sessionUser: SessionUser,
  sessionId: string,
  input: UpdateSessionInput,
) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
  assertParticipantAccess(sessionUser, session.tutorId, session.tuteeId);

  // status changes go through the dedicated routes; here we only allow "mark complete"
  if (input.status !== undefined) {
    if (input.status === SessionStatus.COMPLETED) {
      if (session.status !== SessionStatus.CONFIRMED) {
        throw new ApiError(400, "INVALID_STATE", "Only confirmed sessions can be marked complete.");
      }
    } else {
      throw new ApiError(
        400,
        "INVALID_STATE",
        "Use accept / decline / cancel for status changes.",
      );
    }
  }

  if (
    session.status === SessionStatus.COMPLETED ||
    session.status === SessionStatus.CANCELLED
  ) {
    const editing =
      input.scheduledAt !== undefined ||
      input.durationMinutes !== undefined ||
      input.mode !== undefined ||
      input.locationText !== undefined ||
      input.agreedRateCents !== undefined ||
      input.notes !== undefined;
    if (editing) {
      throw new ApiError(400, "INVALID_INPUT", "Closed sessions cannot be edited.");
    }
  }

  const updated = await db.session.update({
    where: { id: session.id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.durationMinutes != null ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.locationText !== undefined ? { locationText: input.locationText } : {}),
      ...(input.agreedRateCents !== undefined ? { agreedRateCents: input.agreedRateCents } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: sessionInclude,
  });

  return formatSession(updated);
}

export function isSessionLive(scheduledAt: Date, durationMinutes: number) {
  const now = Date.now();
  // open the room 15 minutes early and keep it open 30 minutes past end
  const start = scheduledAt.getTime() - 15 * 60_000;
  const end = scheduledAt.getTime() + durationMinutes * 60_000 + 30 * 60_000;
  return now >= start && now <= end;
}

export function buildIcs(session: {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  subject: { department: string; code: string; name: string };
  participants: { tutor: { fullName: string; email: string }; tutee: { fullName: string; email: string } };
  locationText?: string | null;
  notes?: string | null;
  mode: string;
  roomToken: string;
}, joinUrl: string) {
  const dtStart = formatIcsDate(session.scheduledAt);
  const dtEnd = formatIcsDate(endOf(session.scheduledAt, session.durationMinutes));
  const stamp = formatIcsDate(new Date());
  const summary = `TutorLink — ${session.subject.department} ${session.subject.code}`;
  const description = [
    `Tutor: ${session.participants.tutor.fullName}`,
    `Tutee: ${session.participants.tutee.fullName}`,
    `Mode: ${session.mode}`,
    session.locationText ? `Location: ${session.locationText}` : null,
    session.notes ? `Notes: ${session.notes}` : null,
    `Session room: ${joinUrl}`,
  ]
    .filter(Boolean)
    .join("\\n");

  // dtstart/dtend stay in UTC ('Z' suffix) which every calendar app resolves
  // unambiguously. we also tag the calendar with X-WR-TIMEZONE so apps that
  // honor it (apple calendar, google calendar) display the event in NY time
  // by default.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TutorLink//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-TIMEZONE:America/New_York",
    "BEGIN:VEVENT",
    `UID:${session.id}@tutorlink`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(session.locationText ?? joinUrl)}`,
    `URL:${joinUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

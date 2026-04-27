import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import { canActAsTutee, canActAsTutor, SessionUser } from "@/lib/permissions";

const threadInclude = Prisma.validator<Prisma.MessageThreadInclude>()({
  tutor: {
    include: {
      profile: true,
      tutorProfile: true,
    },
  },
  tutee: {
    include: {
      profile: true,
      tuteeProfile: true,
    },
  },
  request: {
    include: {
      subject: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    include: {
      sender: {
        include: {
          profile: true,
        },
      },
    },
  },
});

const messageInclude = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    include: {
      profile: true,
    },
  },
});

type ThreadRecord = Prisma.MessageThreadGetPayload<{
  include: typeof threadInclude;
}>;

type MessageRecord = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

type CreateThreadInput = {
  tutorId: string;
  tuteeId: string;
  requestId?: string;
};

type CreateThreadResult = {
  reused: boolean;
  thread: ReturnType<typeof formatThread>;
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

function formatLatestMessage(message: ThreadRecord["messages"][number] | undefined) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    sender: {
      id: message.sender.id,
      fullName: message.sender.profile?.fullName ?? message.sender.email,
    },
  };
}

export function formatThread(thread: ThreadRecord) {
  return {
    id: thread.id,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    participants: {
      tutor: formatParticipant(thread.tutor),
      tutee: formatParticipant(thread.tutee),
    },
    request:
      thread.request == null
        ? null
        : {
            id: thread.request.id,
            title: thread.request.title,
            status: thread.request.status,
            subject: {
              id: thread.request.subject.id,
              department: thread.request.subject.department,
              code: thread.request.subject.code,
              name: thread.request.subject.name,
              label: formatSubjectLabel(thread.request.subject),
            },
          },
    latestMessage: formatLatestMessage(thread.messages[0]),
  };
}

export function formatMessage(message: MessageRecord) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    sender: {
      id: message.sender.id,
      fullName: message.sender.profile?.fullName ?? message.sender.email,
      avatarUrl: message.sender.profile?.avatarUrl ?? null,
    },
  };
}

function ensureThreadParticipantRole(sessionUser: SessionUser, thread: { tutorId: string; tuteeId: string }) {
  const isTutorSide = sessionUser.id === thread.tutorId;
  const isTuteeSide = sessionUser.id === thread.tuteeId;

  if (!isTutorSide && !isTuteeSide) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You are not a participant in this thread.",
    );
  }

  if (isTutorSide && !canActAsTutor(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot act as a tutor for this thread.",
    );
  }

  if (isTuteeSide && !canActAsTutee(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot act as a tutee for this thread.",
    );
  }
}

export async function createOrReuseThread(
  sessionUser: SessionUser,
  input: CreateThreadInput,
): Promise<CreateThreadResult> {
  if (input.tutorId === input.tuteeId) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "tutorId and tuteeId must be different users.",
    );
  }

  const currentUserIsTutor = sessionUser.id === input.tutorId;
  const currentUserIsTutee = sessionUser.id === input.tuteeId;

  if (!currentUserIsTutor && !currentUserIsTutee) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You must be one of the participants in the thread.",
    );
  }

  if (currentUserIsTutor && !canActAsTutor(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot start a thread as a tutor.",
    );
  }

  if (currentUserIsTutee && !canActAsTutee(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot start a thread as a tutee.",
    );
  }

  const [tutorUser, tuteeUser, request] = await Promise.all([
    db.user.findUnique({
      where: { id: input.tutorId },
      include: {
        profile: true,
        tutorProfile: true,
      },
    }),
    db.user.findUnique({
      where: { id: input.tuteeId },
      include: {
        profile: true,
        tuteeProfile: true,
      },
    }),
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
  }

  const existingThread = await db.messageThread.findFirst({
    where: {
      tutorId: input.tutorId,
      tuteeId: input.tuteeId,
      requestId: input.requestId ?? null,
    },
    include: threadInclude,
  });

  if (existingThread) {
    return {
      reused: true,
      thread: formatThread(existingThread),
    };
  }

  const thread = await db.messageThread.create({
    data: {
      tutorId: input.tutorId,
      tuteeId: input.tuteeId,
      requestId: input.requestId ?? null,
    },
    include: threadInclude,
  });

  return {
    reused: false,
    thread: formatThread(thread),
  };
}

export async function listThreadsForUser(sessionUser: SessionUser) {
  const threads = await db.messageThread.findMany({
    where: {
      OR: [{ tutorId: sessionUser.id }, { tuteeId: sessionUser.id }],
    },
    include: threadInclude,
    orderBy: { updatedAt: "desc" },
  });

  return threads.map((thread) => {
    const formatted = formatThread(thread);
    const isTutorSide = thread.tutorId === sessionUser.id;
    return {
      ...formatted,
      viewerRole: isTutorSide ? "TUTOR" : "TUTEE",
      counterpart: isTutorSide ? formatted.participants.tutee : formatted.participants.tutor,
    };
  });
}

export async function getThreadDetailForUser(sessionUser: SessionUser, threadId: string) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      ...threadInclude,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (!thread) {
    throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
  }

  ensureThreadParticipantRole(sessionUser, thread);

  return {
    thread: formatThread({
      ...thread,
      messages: thread.messages.slice(-1),
    }),
    messages: thread.messages.map(formatMessage),
  };
}

export async function sendThreadMessage(sessionUser: SessionUser, threadId: string, body: string) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: threadInclude,
  });

  if (!thread) {
    throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
  }

  ensureThreadParticipantRole(sessionUser, thread);

  const message = await db.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        threadId: thread.id,
        senderId: sessionUser.id,
        body,
      },
      include: messageInclude,
    });

    await tx.messageThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return createdMessage;
  });

  const refreshedThread = await db.messageThread.findUnique({
    where: { id: thread.id },
    include: threadInclude,
  });

  if (!refreshedThread) {
    throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
  }

  return {
    message: formatMessage(message),
    thread: formatThread(refreshedThread),
  };
}

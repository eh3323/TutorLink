import { Prisma, Role } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
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
  _count: {
    select: {
      messages: true,
      sessions: true,
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

const threadDetailInclude = Prisma.validator<Prisma.MessageThreadInclude>()({
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
  _count: {
    select: {
      messages: true,
      sessions: true,
    },
  },
});

type ThreadRecord = Prisma.MessageThreadGetPayload<{
  include: typeof threadInclude;
}>;

type ThreadDetailRecord = Prisma.MessageThreadGetPayload<{
  include: typeof threadDetailInclude;
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

type ThreadSearchParams = {
  mine?: "all" | "tutor" | "tutee";
};

function hasTutorRole(role: Role | null) {
  return role === Role.TUTOR || role === Role.BOTH;
}

function hasTuteeRole(role: Role | null) {
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
    stats: {
      messageCount: thread._count.messages,
      sessionCount: thread._count.sessions,
    },
  };
}

export function formatThreadDetail(thread: ThreadDetailRecord) {
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
    stats: {
      messageCount: thread._count.messages,
      sessionCount: thread._count.sessions,
    },
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

export function parseThreadSearchParams(searchParams: URLSearchParams): ThreadSearchParams {
  const mineRaw = searchParams.get("mine");

  if (!mineRaw) {
    return {};
  }

  if (mineRaw !== "all" && mineRaw !== "tutor" && mineRaw !== "tutee") {
    throw new ApiError(400, "INVALID_INPUT", "mine must be all, tutor, or tutee.");
  }

  return {
    mine: mineRaw,
  };
}

export function parseMessageListParams(searchParams: URLSearchParams) {
  const threadId = searchParams.get("threadId")?.trim();
  const limitRaw = searchParams.get("limit");

  if (!threadId) {
    throw new ApiError(400, "INVALID_INPUT", "threadId is required.");
  }

  let limit = 50;
  if (limitRaw) {
    const parsedLimit = Number.parseInt(limitRaw, 10);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new ApiError(400, "INVALID_INPUT", "limit must be an integer from 1 to 100.");
    }

    limit = parsedLimit;
  }

  return {
    threadId,
    limit,
  };
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

export async function listThreads(sessionUser: SessionUser, filters: ThreadSearchParams) {
  const threads = await db.messageThread.findMany({
    where: {
      OR: [
        ...(filters.mine === "tutor"
          ? [{ tutorId: sessionUser.id }]
          : filters.mine === "tutee"
            ? [{ tuteeId: sessionUser.id }]
            : [{ tutorId: sessionUser.id }, { tuteeId: sessionUser.id }]),
      ],
    },
    include: threadInclude,
    orderBy: [
      {
        updatedAt: "desc",
      },
    ],
  });

  return {
    threads: threads.map(formatThread),
    filters: {
      mine: filters.mine ?? "all",
    },
    total: threads.length,
  };
}

export async function getThreadDetail(sessionUser: SessionUser, threadId: string) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: threadDetailInclude,
  });

  if (!thread) {
    throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
  }

  ensureThreadParticipantRole(sessionUser, thread);

  return formatThreadDetail(thread);
}

export async function listThreadMessages(
  sessionUser: SessionUser,
  threadId: string,
  limit: number,
) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: threadDetailInclude,
  });

  if (!thread) {
    throw new ApiError(404, "THREAD_NOT_FOUND", "Message thread was not found.");
  }

  ensureThreadParticipantRole(sessionUser, thread);

  const messages = await db.message.findMany({
    where: { threadId },
    include: messageInclude,
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
  });

  return {
    thread: formatThreadDetail(thread),
    messages: messages.map(formatMessage),
    total: messages.length,
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

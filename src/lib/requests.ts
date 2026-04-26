import { DeliveryMode, Prisma, RequestStatus, Role } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { canActAsTutee, SessionUser } from "@/lib/permissions";

const requestInclude = Prisma.validator<Prisma.TutoringRequestInclude>()({
  subject: true,
  tutee: {
    include: {
      profile: true,
      tuteeProfile: true,
    },
  },
  _count: {
    select: {
      applications: true,
      messageThreads: true,
      sessions: true,
    },
  },
});

type RequestRecord = Prisma.TutoringRequestGetPayload<{
  include: typeof requestInclude;
}>;

type CreateRequestInput = {
  subjectId: string;
  title: string;
  description: string;
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  preferredMode: DeliveryMode;
  locationText?: string | null;
  preferredStartAt?: Date | null;
  preferredEndAt?: Date | null;
};

type RequestSearchParams = {
  subject?: string;
  status?: RequestStatus;
  mode?: DeliveryMode;
  mine?: boolean;
};

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

export function formatRequest(request: RequestRecord) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    budgetMinCents: request.budgetMinCents,
    budgetMaxCents: request.budgetMaxCents,
    preferredMode: request.preferredMode,
    locationText: request.locationText,
    preferredStartAt: request.preferredStartAt,
    preferredEndAt: request.preferredEndAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    tutee: formatParticipant(request.tutee),
    subject: {
      id: request.subject.id,
      department: request.subject.department,
      code: request.subject.code,
      name: request.subject.name,
      label: formatSubjectLabel(request.subject),
    },
    stats: {
      applicationCount: request._count.applications,
      threadCount: request._count.messageThreads,
      sessionCount: request._count.sessions,
    },
  };
}

export function parseRequestSearchParams(searchParams: URLSearchParams): RequestSearchParams {
  const subject = searchParams.get("subject")?.trim() || undefined;
  const statusRaw = searchParams.get("status");
  const modeRaw = searchParams.get("mode");
  const mineRaw = searchParams.get("mine");

  let status: RequestStatus | undefined;
  if (statusRaw) {
    if (
      statusRaw !== RequestStatus.OPEN &&
      statusRaw !== RequestStatus.MATCHED &&
      statusRaw !== RequestStatus.CLOSED &&
      statusRaw !== RequestStatus.CANCELLED
    ) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "status must be OPEN, MATCHED, CLOSED, or CANCELLED.",
      );
    }

    status = statusRaw;
  }

  let mode: DeliveryMode | undefined;
  if (modeRaw) {
    if (modeRaw !== DeliveryMode.ONLINE && modeRaw !== DeliveryMode.IN_PERSON) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "mode must be ONLINE or IN_PERSON.",
      );
    }

    mode = modeRaw;
  }

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
    subject,
    status,
    mode,
    mine,
  };
}

export async function createTutoringRequest(
  sessionUser: SessionUser,
  input: CreateRequestInput,
) {
  if (!canActAsTutee(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account cannot create a tutoring request.",
    );
  }

  if (
    input.budgetMinCents != null &&
    input.budgetMaxCents != null &&
    input.budgetMinCents > input.budgetMaxCents
  ) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "budgetMinCents cannot be greater than budgetMaxCents.",
    );
  }

  if (
    input.preferredStartAt != null &&
    input.preferredEndAt != null &&
    input.preferredStartAt > input.preferredEndAt
  ) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "preferredStartAt cannot be later than preferredEndAt.",
    );
  }

  const [user, subject] = await Promise.all([
    db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        profile: true,
        tuteeProfile: true,
      },
    }),
    db.subject.findUnique({
      where: { id: input.subjectId },
    }),
  ]);

  if (!user || !hasTuteeRole(user.role) || !user.tuteeProfile) {
    throw new ApiError(404, "USER_NOT_FOUND", "Tutee participant was not found.");
  }

  if (!subject) {
    throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found.");
  }

  const request = await db.tutoringRequest.create({
    data: {
      tuteeId: user.id,
      subjectId: input.subjectId,
      title: input.title,
      description: input.description,
      budgetMinCents: input.budgetMinCents ?? null,
      budgetMaxCents: input.budgetMaxCents ?? null,
      preferredMode: input.preferredMode,
      locationText: input.locationText ?? null,
      preferredStartAt: input.preferredStartAt ?? null,
      preferredEndAt: input.preferredEndAt ?? null,
    },
    include: requestInclude,
  });

  return formatRequest(request);
}

export async function listTutoringRequests(
  searchParams: RequestSearchParams,
  sessionUserId?: string,
) {
  if (searchParams.mine && !sessionUserId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "You must be signed in to query your own requests.",
    );
  }

  const requests = await db.tutoringRequest.findMany({
    where: {
      ...(searchParams.mine && sessionUserId ? { tuteeId: sessionUserId } : {}),
      ...(searchParams.status ? { status: searchParams.status } : {}),
      ...(searchParams.mode ? { preferredMode: searchParams.mode } : {}),
      ...(searchParams.subject
        ? {
            subject: {
              OR: [
                {
                  department: {
                    contains: searchParams.subject,
                    mode: "insensitive",
                  },
                },
                {
                  code: {
                    contains: searchParams.subject,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: searchParams.subject,
                    mode: "insensitive",
                  },
                },
              ],
            },
          }
        : {}),
    },
    include: requestInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return {
    requests: requests.map(formatRequest),
    filters: {
      subject: searchParams.subject ?? null,
      status: searchParams.status ?? null,
      mode: searchParams.mode ?? null,
      mine: searchParams.mine ?? null,
    },
    total: requests.length,
  };
}

export async function getTutoringRequestDetail(requestId: string) {
  const request = await db.tutoringRequest.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });

  if (!request) {
    throw new ApiError(404, "REQUEST_NOT_FOUND", "Tutoring request was not found.");
  }

  return formatRequest(request);
}

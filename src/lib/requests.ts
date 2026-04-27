import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { DeliveryMode, RequestStatus } from "@/lib/enums";
import { canActAsTutee, SessionUser } from "@/lib/permissions";

const requestInclude = Prisma.validator<Prisma.TutoringRequestInclude>()({
  tutee: {
    include: {
      profile: true,
      tuteeProfile: true,
    },
  },
  subject: true,
});

type RequestRecord = Prisma.TutoringRequestGetPayload<{
  include: typeof requestInclude;
}>;

function formatSubjectLabel(subject: { department: string; code: string; name: string }) {
  return `${subject.department} ${subject.code} - ${subject.name}`;
}

export function formatRequest(request: RequestRecord) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    budgetMinCents: request.budgetMinCents,
    budgetMaxCents: request.budgetMaxCents,
    preferredMode: request.preferredMode,
    locationText: request.locationText,
    preferredStartAt: request.preferredStartAt,
    preferredEndAt: request.preferredEndAt,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    subject: {
      id: request.subject.id,
      department: request.subject.department,
      code: request.subject.code,
      name: request.subject.name,
      label: formatSubjectLabel(request.subject),
    },
    tutee: {
      id: request.tutee.id,
      fullName: request.tutee.profile?.fullName ?? request.tutee.email,
      email: request.tutee.email,
      major: request.tutee.profile?.major ?? null,
      graduationYear: request.tutee.profile?.graduationYear ?? null,
      avatarUrl: request.tutee.profile?.avatarUrl ?? null,
    },
  };
}

export type RequestSearchParams = {
  subject?: string;
  mode?: "online" | "in-person";
  status?: string;
};

export function parseRequestSearchParams(searchParams: URLSearchParams): RequestSearchParams {
  const subject = searchParams.get("subject")?.trim() || undefined;
  const mode = searchParams.get("mode")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || undefined;

  if (mode && mode !== "online" && mode !== "in-person") {
    throw new ApiError(400, "INVALID_INPUT", "mode must be online or in-person.");
  }

  if (
    status &&
    status !== RequestStatus.OPEN &&
    status !== RequestStatus.MATCHED &&
    status !== RequestStatus.CLOSED &&
    status !== RequestStatus.CANCELLED
  ) {
    throw new ApiError(400, "INVALID_INPUT", "status is invalid.");
  }

  return {
    subject,
    mode: mode as RequestSearchParams["mode"],
    status,
  };
}

export async function listRequests(params: RequestSearchParams) {
  const subjectFilter = params.subject
    ? {
        OR: [
          { department: { contains: params.subject } },
          { code: { contains: params.subject } },
          { name: { contains: params.subject } },
        ],
      }
    : undefined;

  const requests = await db.tutoringRequest.findMany({
    where: {
      ...(params.status ? { status: params.status } : { status: RequestStatus.OPEN }),
      ...(params.mode === "online" ? { preferredMode: DeliveryMode.ONLINE } : {}),
      ...(params.mode === "in-person" ? { preferredMode: DeliveryMode.IN_PERSON } : {}),
      ...(subjectFilter ? { subject: subjectFilter } : {}),
    },
    include: requestInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    requests: requests.map(formatRequest),
    filters: {
      subject: params.subject ?? null,
      mode: params.mode ?? null,
      status: params.status ?? null,
    },
    total: requests.length,
  };
}

export async function getRequestDetail(id: string) {
  const request = await db.tutoringRequest.findUnique({
    where: { id },
    include: requestInclude,
  });

  if (!request) {
    throw new ApiError(404, "REQUEST_NOT_FOUND", "Tutoring request was not found.");
  }

  return formatRequest(request);
}

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

export async function createRequest(sessionUser: SessionUser, input: CreateRequestInput) {
  if (!canActAsTutee(sessionUser.role)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your account must be a tutee to post a tutoring request.",
    );
  }

  const subject = await db.subject.findUnique({ where: { id: input.subjectId } });

  if (!subject) {
    throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found.");
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

  const request = await db.tutoringRequest.create({
    data: {
      tuteeId: sessionUser.id,
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

export async function listMyRequests(sessionUser: SessionUser) {
  const requests = await db.tutoringRequest.findMany({
    where: { tuteeId: sessionUser.id },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  return requests.map(formatRequest);
}

export async function listSubjects() {
  const subjects = await db.subject.findMany({
    orderBy: [{ department: "asc" }, { code: "asc" }],
  });

  return subjects.map((subject) => ({
    id: subject.id,
    department: subject.department,
    code: subject.code,
    name: subject.name,
    label: formatSubjectLabel(subject),
  }));
}

import { ApiError, apiCreated, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { DeliveryMode } from "@/lib/enums";
import { requireSessionUser } from "@/lib/permissions";
import { createSession, listSessionsForUser } from "@/lib/sessions";
import { parseNumber, parseString, requireObject } from "@/lib/validation";

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    return apiOk({ sessions: await listSessionsForUser(sessionUser) });
  } catch (error) {
    return handleRouteError(error);
  }
}

type SessionPostBody = {
  tutorId?: unknown;
  tuteeId?: unknown;
  subjectId?: unknown;
  threadId?: unknown;
  requestId?: unknown;
  scheduledAt?: unknown;
  durationMinutes?: unknown;
  mode?: unknown;
  locationText?: unknown;
  agreedRateCents?: unknown;
  notes?: unknown;
};

function parseMode(value: unknown, field: string) {
  if (value !== DeliveryMode.ONLINE && value !== DeliveryMode.IN_PERSON) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be ONLINE or IN_PERSON.`);
  }

  return value;
}

function parseDateTimeString(value: unknown, field: string) {
  const text = parseString(value, {
    field,
    required: true,
    minLength: 1,
    maxLength: 100,
  });

  if (!text) {
    throw new ApiError(400, "INVALID_INPUT", `${field} is required.`);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      `${field} must be a valid ISO datetime string.`,
    );
  }

  return date;
}

function parseNullableString(value: unknown, field: string, maxLength: number) {
  if (value === undefined) {
    return undefined;
  }

  if (value == null || value === "") {
    return null;
  }

  return parseString(value, {
    field,
    minLength: 1,
    maxLength,
  });
}

function parseNullableInteger(
  value: unknown,
  field: string,
  options: { min: number; max: number },
) {
  if (value === undefined) {
    return undefined;
  }

  if (value == null || value === "") {
    return null;
  }

  return parseNumber(value, {
    field,
    integer: true,
    min: options.min,
    max: options.max,
  });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = requireObject(await readJsonBody<SessionPostBody>(request));

    const tutorId = parseString(body.tutorId, {
      field: "tutorId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });
    const tuteeId = parseString(body.tuteeId, {
      field: "tuteeId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });
    const subjectId = parseString(body.subjectId, {
      field: "subjectId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });
    const threadId = parseString(body.threadId, {
      field: "threadId",
      minLength: 1,
      maxLength: 100,
    });
    const requestId = parseString(body.requestId, {
      field: "requestId",
      minLength: 1,
      maxLength: 100,
    });
    const scheduledAt = parseDateTimeString(body.scheduledAt, "scheduledAt");
    const durationMinutes = parseNumber(body.durationMinutes, {
      field: "durationMinutes",
      required: true,
      integer: true,
      min: 15,
      max: 600,
    });
    const mode = parseMode(body.mode, "mode");
    const locationText = parseNullableString(body.locationText, "locationText", 120);
    const agreedRateCents = parseNullableInteger(body.agreedRateCents, "agreedRateCents", {
      min: 0,
      max: 1000000,
    });
    const notes = parseNullableString(body.notes, "notes", 1000);

    if (!tutorId || !tuteeId || !subjectId || durationMinutes == null) {
      throw new ApiError(400, "INVALID_INPUT", "Missing required session fields.");
    }

    return apiCreated(
      await createSession(sessionUser, {
        tutorId,
        tuteeId,
        subjectId,
        threadId,
        requestId,
        scheduledAt,
        durationMinutes,
        mode,
        locationText,
        agreedRateCents,
        notes,
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

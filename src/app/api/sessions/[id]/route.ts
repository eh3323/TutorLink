import { DeliveryMode, SessionStatus } from "@prisma/client";

import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { getSessionDetail, updateSession } from "@/lib/sessions";
import { parseNumber, parseString, requireObject } from "@/lib/validation";

type SessionPatchBody = {
  status?: unknown;
  scheduledAt?: unknown;
  durationMinutes?: unknown;
  mode?: unknown;
  locationText?: unknown;
  agreedRateCents?: unknown;
  notes?: unknown;
};

type SessionRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseStatus(value: unknown) {
  if (
    value !== SessionStatus.PENDING &&
    value !== SessionStatus.CONFIRMED &&
    value !== SessionStatus.COMPLETED &&
    value !== SessionStatus.CANCELLED
  ) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "status must be PENDING, CONFIRMED, COMPLETED, or CANCELLED.",
    );
  }

  return value;
}

function parseMode(value: unknown) {
  if (value !== DeliveryMode.ONLINE && value !== DeliveryMode.IN_PERSON) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "mode must be ONLINE or IN_PERSON.",
    );
  }

  return value;
}

function parseOptionalDateTime(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

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

export async function PATCH(request: Request, context: SessionRouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    const body = requireObject(await readJsonBody<SessionPatchBody>(request));

    const status = body.status === undefined ? undefined : parseStatus(body.status);
    const scheduledAt = parseOptionalDateTime(body.scheduledAt, "scheduledAt");
    const durationMinutes =
      body.durationMinutes === undefined
        ? undefined
        : parseNumber(body.durationMinutes, {
            field: "durationMinutes",
            integer: true,
            min: 15,
            max: 600,
          });
    const mode = body.mode === undefined ? undefined : parseMode(body.mode);
    const locationText = parseNullableString(body.locationText, "locationText", 120);
    const agreedRateCents = parseNullableInteger(body.agreedRateCents, "agreedRateCents", {
      min: 0,
      max: 100000,
    });
    const notes = parseNullableString(body.notes, "notes", 1000);

    return apiOk(
      await updateSession(sessionUser, id, {
        status,
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

export async function GET(_: Request, context: SessionRouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    return apiOk(await getSessionDetail(sessionUser, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

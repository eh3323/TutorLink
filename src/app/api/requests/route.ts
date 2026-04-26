import { DeliveryMode } from "@prisma/client";

import { auth } from "@/lib/auth";
import { ApiError, apiCreated, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import {
  createTutoringRequest,
  listTutoringRequests,
  parseRequestSearchParams,
} from "@/lib/requests";
import { parseNumber, parseString, requireObject } from "@/lib/validation";

type RequestPostBody = {
  subjectId?: unknown;
  title?: unknown;
  description?: unknown;
  budgetMinCents?: unknown;
  budgetMaxCents?: unknown;
  preferredMode?: unknown;
  locationText?: unknown;
  preferredStartAt?: unknown;
  preferredEndAt?: unknown;
};

function parseMode(value: unknown) {
  if (value !== DeliveryMode.ONLINE && value !== DeliveryMode.IN_PERSON) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "preferredMode must be ONLINE or IN_PERSON.",
    );
  }

  return value;
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

function parseNullableDateTime(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value == null || value === "") {
    return null;
  }

  const text = parseString(value, {
    field,
    minLength: 1,
    maxLength: 100,
  });

  if (!text) {
    return null;
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

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = requireObject(await readJsonBody<RequestPostBody>(request));

    const subjectId = parseString(body.subjectId, {
      field: "subjectId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });

    const title = parseString(body.title, {
      field: "title",
      required: true,
      minLength: 3,
      maxLength: 120,
    });

    const description = parseString(body.description, {
      field: "description",
      required: true,
      minLength: 10,
      maxLength: 2000,
    });

    const budgetMinCents = parseNullableInteger(body.budgetMinCents, "budgetMinCents", {
      min: 0,
      max: 100000,
    });

    const budgetMaxCents = parseNullableInteger(body.budgetMaxCents, "budgetMaxCents", {
      min: 0,
      max: 100000,
    });

    const preferredMode = parseMode(body.preferredMode);
    const locationText = parseNullableString(body.locationText, "locationText", 120);
    const preferredStartAt = parseNullableDateTime(body.preferredStartAt, "preferredStartAt");
    const preferredEndAt = parseNullableDateTime(body.preferredEndAt, "preferredEndAt");

    if (!subjectId || !title || !description) {
      throw new ApiError(400, "INVALID_INPUT", "Missing required request fields.");
    }

    return apiCreated(
      await createTutoringRequest(sessionUser, {
        subjectId,
        title,
        description,
        budgetMinCents,
        budgetMaxCents,
        preferredMode,
        locationText,
        preferredStartAt,
        preferredEndAt,
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseRequestSearchParams(searchParams);
    const session = await auth();

    return apiOk(await listTutoringRequests(filters, session?.user?.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

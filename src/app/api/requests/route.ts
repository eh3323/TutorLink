import { ApiError, apiCreated, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { DeliveryMode } from "@/lib/enums";
import { requireSessionUser } from "@/lib/permissions";
import {
  createRequest,
  listRequests,
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
    throw new ApiError(400, "INVALID_INPUT", "preferredMode must be ONLINE or IN_PERSON.");
  }
  return value as DeliveryMode;
}

function parseNullableInt(value: unknown, field: string, min: number, max: number) {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  return parseNumber(value, { field, integer: true, min, max });
}

function parseNullableDate(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const text = parseString(value, { field, required: true, maxLength: 100 });
  if (!text) throw new ApiError(400, "INVALID_INPUT", `${field} is required.`);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be a valid datetime.`);
  }
  return date;
}

function parseNullableString(value: unknown, field: string, maxLength: number) {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  return parseString(value, { field, minLength: 1, maxLength });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = parseRequestSearchParams(url.searchParams);
    return apiOk(await listRequests(params));
  } catch (error) {
    return handleRouteError(error);
  }
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
      maxLength: 200,
    });
    const description = parseString(body.description, {
      field: "description",
      required: true,
      minLength: 10,
      maxLength: 2000,
    });
    const preferredMode = parseMode(body.preferredMode);
    const budgetMinCents = parseNullableInt(body.budgetMinCents, "budgetMinCents", 0, 1000000);
    const budgetMaxCents = parseNullableInt(body.budgetMaxCents, "budgetMaxCents", 0, 1000000);
    const locationText = parseNullableString(body.locationText, "locationText", 200);
    const preferredStartAt = parseNullableDate(body.preferredStartAt, "preferredStartAt");
    const preferredEndAt = parseNullableDate(body.preferredEndAt, "preferredEndAt");

    if (!subjectId || !title || !description) {
      throw new ApiError(400, "INVALID_INPUT", "Missing required request fields.");
    }

    return apiCreated(
      await createRequest(sessionUser, {
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

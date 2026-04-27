import { auth } from "@/lib/auth";
import { ApiError, apiCreated, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { createReview, listReviews, parseReviewSearchParams } from "@/lib/reviews";
import { parseNumber, parseString, requireObject } from "@/lib/validation";

type ReviewPostBody = {
  sessionId?: unknown;
  rating?: unknown;
  comment?: unknown;
  criteria?: unknown;
};

type ParsedCriteria = {
  punctuality: number | null;
  preparation: number | null;
  communication: number | null;
  helpfulness: number | null;
  respectful: number | null;
};

function parseOptionalRating(value: unknown, field: string): number | null {
  if (value == null || value === "") return null;
  const n = parseNumber(value, {
    field,
    integer: true,
    min: 1,
    max: 5,
  });
  return n ?? null;
}

function parseCriteria(value: unknown): ParsedCriteria | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  return {
    punctuality: parseOptionalRating(obj.punctuality, "criteria.punctuality"),
    preparation: parseOptionalRating(obj.preparation, "criteria.preparation"),
    communication: parseOptionalRating(obj.communication, "criteria.communication"),
    helpfulness: parseOptionalRating(obj.helpfulness, "criteria.helpfulness"),
    respectful: parseOptionalRating(obj.respectful, "criteria.respectful"),
  };
}

function parseNullableComment(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value == null || value === "") {
    return null;
  }

  return parseString(value, {
    field: "comment",
    minLength: 1,
    maxLength: 1000,
  });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = requireObject(await readJsonBody<ReviewPostBody>(request));

    const sessionId = parseString(body.sessionId, {
      field: "sessionId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });

    const rating = parseNumber(body.rating, {
      field: "rating",
      required: true,
      integer: true,
      min: 1,
      max: 5,
    });

    const comment = parseNullableComment(body.comment);
    const criteria = parseCriteria(body.criteria);

    if (!sessionId || rating == null) {
      throw new ApiError(400, "INVALID_INPUT", "Missing required review fields.");
    }

    return apiCreated(
      await createReview(sessionUser, {
        sessionId,
        rating,
        comment,
        criteria,
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReviewSearchParams(searchParams);
    const session = await auth();

    return apiOk(await listReviews(filters, session?.user?.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

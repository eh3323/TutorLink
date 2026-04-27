import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { setReviewReply } from "@/lib/reviews";
import { parseString, requireObject } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

type ReplyBody = { reply?: unknown };

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    const body = requireObject(await readJsonBody<ReplyBody>(request));
    const reply = parseString(body.reply, {
      field: "reply",
      required: true,
      minLength: 1,
      maxLength: 1000,
    });
    if (!reply) {
      throw new ApiError(400, "INVALID_INPUT", "Reply text is required.");
    }
    return apiOk(await setReviewReply(sessionUser, { reviewId: id, reply }));
  } catch (error) {
    return handleRouteError(error);
  }
}

import { apiCreated, handleRouteError, readJsonBody } from "@/lib/api";
import { sendThreadMessage } from "@/lib/messages";
import { requireSessionUser } from "@/lib/permissions";
import { parseString, requireObject } from "@/lib/validation";

type MessagePostBody = {
  threadId?: unknown;
  body?: unknown;
};

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const payload = requireObject(await readJsonBody<MessagePostBody>(request));

    const threadId = parseString(payload.threadId, {
      field: "threadId",
      required: true,
      minLength: 1,
      maxLength: 100,
    });

    const body = parseString(payload.body, {
      field: "body",
      required: true,
      minLength: 1,
      maxLength: 2000,
    });

    if (!threadId || !body) {
      throw new Error("Required message fields were not parsed.");
    }

    return apiCreated(await sendThreadMessage(sessionUser, threadId, body));
  } catch (error) {
    return handleRouteError(error);
  }
}

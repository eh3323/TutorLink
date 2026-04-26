import { apiCreated, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { createOrReuseThread, listThreads, parseThreadSearchParams } from "@/lib/messages";
import { requireSessionUser } from "@/lib/permissions";
import { parseString, requireObject } from "@/lib/validation";

type ThreadPostBody = {
  tutorId?: unknown;
  tuteeId?: unknown;
  requestId?: unknown;
};

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = requireObject(await readJsonBody<ThreadPostBody>(request));

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

    const requestId = parseString(body.requestId, {
      field: "requestId",
      maxLength: 100,
    });

    if (!tutorId || !tuteeId) {
      throw new Error("Required participant ids were not parsed.");
    }

    const result = await createOrReuseThread(sessionUser, {
      tutorId,
      tuteeId,
      requestId,
    });

    return result.reused ? apiOk(result) : apiCreated(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const filters = parseThreadSearchParams(searchParams);

    return apiOk(await listThreads(sessionUser, filters));
  } catch (error) {
    return handleRouteError(error);
  }
}

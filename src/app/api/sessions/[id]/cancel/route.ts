import { apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { cancelSession } from "@/lib/sessions";
import { requireSessionUser } from "@/lib/permissions";
import { parseString } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };
type Body = { reason?: unknown };

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    let reason: string | null = null;
    try {
      const raw = (await readJsonBody<Body>(request).catch(() => null)) ?? null;
      if (raw && typeof raw === "object") {
        reason = parseString((raw as Body).reason, {
          field: "reason",
          maxLength: 500,
        }) ?? null;
      }
    } catch {
      // body is optional
    }
    return apiOk(await cancelSession(sessionUser, id, reason));
  } catch (error) {
    return handleRouteError(error);
  }
}

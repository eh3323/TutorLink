import { apiOk, handleRouteError } from "@/lib/api";
import { markThreadReadForUser } from "@/lib/messages";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    await markThreadReadForUser(sessionUser, id);
    return apiOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

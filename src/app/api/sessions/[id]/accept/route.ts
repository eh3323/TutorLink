import { apiOk, handleRouteError } from "@/lib/api";
import { acceptSession } from "@/lib/sessions";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    return apiOk(await acceptSession(sessionUser, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

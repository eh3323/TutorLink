import { apiOk, handleRouteError } from "@/lib/api";
import { getThreadDetailForUser } from "@/lib/messages";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    return apiOk(await getThreadDetailForUser(sessionUser, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

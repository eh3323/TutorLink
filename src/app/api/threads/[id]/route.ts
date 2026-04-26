import { apiOk, handleRouteError } from "@/lib/api";
import { getThreadDetail } from "@/lib/messages";
import { requireSessionUser } from "@/lib/permissions";

type ThreadDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: ThreadDetailRouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    return apiOk(await getThreadDetail(sessionUser, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

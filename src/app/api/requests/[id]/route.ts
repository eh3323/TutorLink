import { apiOk, handleRouteError } from "@/lib/api";
import { getRequestDetail } from "@/lib/requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return apiOk(await getRequestDetail(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

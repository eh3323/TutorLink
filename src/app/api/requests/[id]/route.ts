import { apiOk, handleRouteError } from "@/lib/api";
import { getTutoringRequestDetail } from "@/lib/requests";

type RequestDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RequestDetailRouteContext) {
  try {
    const { id } = await context.params;
    return apiOk(await getTutoringRequestDetail(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

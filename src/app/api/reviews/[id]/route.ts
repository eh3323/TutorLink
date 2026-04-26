import { apiOk, handleRouteError } from "@/lib/api";
import { getReviewDetail } from "@/lib/reviews";

type ReviewDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: ReviewDetailRouteContext) {
  try {
    const { id } = await context.params;
    return apiOk(await getReviewDetail(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

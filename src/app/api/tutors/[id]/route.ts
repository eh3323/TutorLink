import { apiOk, handleRouteError } from "@/lib/api";
import { getTutorDetail } from "@/lib/tutors";

type TutorDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: TutorDetailRouteContext) {
  try {
    const { id } = await context.params;
    return apiOk(await getTutorDetail(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

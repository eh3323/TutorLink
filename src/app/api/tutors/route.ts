import { apiOk, handleRouteError } from "@/lib/api";
import { listTutors, parseTutorSearchParams } from "@/lib/tutors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseTutorSearchParams(searchParams);

    return apiOk(await listTutors(filters));
  } catch (error) {
    return handleRouteError(error);
  }
}

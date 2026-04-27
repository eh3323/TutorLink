import { apiOk, handleRouteError } from "@/lib/api";
import { listSubjects } from "@/lib/requests";

export async function GET() {
  try {
    return apiOk({ subjects: await listSubjects() });
  } catch (error) {
    return handleRouteError(error);
  }
}

import { apiOk, handleRouteError } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { getCurrentUserProfileData } from "@/lib/profile";

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    return apiOk(await getCurrentUserProfileData(sessionUser.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

import { apiOk, handleRouteError } from "@/lib/api";
import { getAdminStats } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  try {
    await requireAdmin();
    return apiOk(await getAdminStats());
  } catch (error) {
    return handleRouteError(error);
  }
}

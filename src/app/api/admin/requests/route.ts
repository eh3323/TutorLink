import { apiOk, handleRouteError } from "@/lib/api";
import { listAdminRequests } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  try {
    await requireAdmin();
    return apiOk({ requests: await listAdminRequests() });
  } catch (error) {
    return handleRouteError(error);
  }
}

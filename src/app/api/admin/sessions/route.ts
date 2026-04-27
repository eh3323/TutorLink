import { apiOk, handleRouteError } from "@/lib/api";
import { listAdminSessions } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  try {
    await requireAdmin();
    return apiOk({ sessions: await listAdminSessions() });
  } catch (error) {
    return handleRouteError(error);
  }
}

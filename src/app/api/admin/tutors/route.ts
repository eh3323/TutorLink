import { apiOk, handleRouteError } from "@/lib/api";
import { listAdminTutors } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const status = new URL(request.url).searchParams.get("status")?.trim() || null;
    return apiOk({ tutors: await listAdminTutors({ status }) });
  } catch (error) {
    return handleRouteError(error);
  }
}

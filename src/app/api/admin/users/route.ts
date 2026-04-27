import { apiOk, handleRouteError } from "@/lib/api";
import { listAdminUsers } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || null;
    const role = url.searchParams.get("role")?.trim() || null;
    return apiOk({ users: await listAdminUsers({ search, role }) });
  } catch (error) {
    return handleRouteError(error);
  }
}

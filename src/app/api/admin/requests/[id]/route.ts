import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { setRequestStatus } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";
import { parseString, requireObject } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = { status?: unknown };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = requireObject(await readJsonBody<PatchBody>(request));
    const status = parseString(body.status, {
      field: "status",
      required: true,
      maxLength: 20,
    });
    if (!status) {
      throw new ApiError(400, "INVALID_INPUT", "status is required.");
    }
    return apiOk(await setRequestStatus(id, status));
  } catch (error) {
    return handleRouteError(error);
  }
}

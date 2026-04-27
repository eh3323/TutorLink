import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { setUserVerification } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";
import { parseString, requireObject } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = { verificationStatus?: unknown };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = requireObject(await readJsonBody<PatchBody>(request));
    const verificationStatus = parseString(body.verificationStatus, {
      field: "verificationStatus",
      required: true,
      maxLength: 20,
    });
    if (!verificationStatus) {
      throw new ApiError(400, "INVALID_INPUT", "verificationStatus is required.");
    }
    return apiOk(await setUserVerification(id, verificationStatus));
  } catch (error) {
    return handleRouteError(error);
  }
}

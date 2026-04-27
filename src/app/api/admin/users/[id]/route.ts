import { apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { deleteUser, patchUser } from "@/lib/admin";
import { requireAdmin } from "@/lib/permissions";
import { parseBoolean, parseString, requireObject } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  isAdmin?: unknown;
  isSuspended?: unknown;
  role?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = requireObject(await readJsonBody<PatchBody>(request));

    const isAdmin = parseBoolean(body.isAdmin, "isAdmin");
    const isSuspended = parseBoolean(body.isSuspended, "isSuspended");
    const role = parseString(body.role, {
      field: "role",
      minLength: 1,
      maxLength: 20,
    });

    const updated = await patchUser(admin.id, id, {
      isAdmin,
      isSuspended,
      role,
    });
    return apiOk(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    return apiOk(await deleteUser(admin.id, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

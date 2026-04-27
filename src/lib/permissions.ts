import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Role } from "@/lib/enums";

export async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Admin access is required.");
  }
  return user;
}

export type SessionUser = NonNullable<NonNullable<Awaited<ReturnType<typeof auth>>>["user"]>;

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiError(401, "UNAUTHORIZED", "You must be signed in.");
  }

  return session.user;
}

export function hasAnyRole(userRole: string | null | undefined, allowedRoles: Role[]) {
  return userRole != null && (allowedRoles as string[]).includes(userRole);
}

export function requireRole(userRole: string | null | undefined, allowedRoles: Role[]) {
  if (!hasAnyRole(userRole, allowedRoles)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this action.");
  }
}

export function requireOwner(sessionUserId: string, ownerUserId: string) {
  if (sessionUserId !== ownerUserId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have access to this resource.",
    );
  }
}

export function canActAsTutor(role: string | null | undefined) {
  return role === Role.TUTOR || role === Role.BOTH;
}

export function canActAsTutee(role: string | null | undefined) {
  return role === Role.TUTEE || role === Role.BOTH;
}

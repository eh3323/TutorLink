import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export type SessionUser = NonNullable<NonNullable<Awaited<ReturnType<typeof auth>>>["user"]>;

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiError(401, "UNAUTHORIZED", "You must be signed in.");
  }

  return session.user;
}

export function hasAnyRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}

export function requireRole(userRole: Role, allowedRoles: Role[]) {
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

export function canActAsTutor(role: Role) {
  return role === Role.TUTOR || role === Role.BOTH;
}

export function canActAsTutee(role: Role) {
  return role === Role.TUTEE || role === Role.BOTH;
}

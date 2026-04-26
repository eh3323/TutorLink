import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { canActAsTutee, canActAsTutor } from "@/lib/permissions";

const currentUserProfileInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
  tutorProfile: {
    include: {
      subjects: {
        include: {
          subject: true,
        },
      },
    },
  },
  tuteeProfile: true,
});

export type CurrentUserProfileRecord = Prisma.UserGetPayload<{
  include: typeof currentUserProfileInclude;
}>;

export function formatCurrentUserProfile(user: CurrentUserProfileRecord) {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolEmailVerifiedAt: user.schoolEmailVerifiedAt,
      createdAt: user.createdAt,
    },
    profile: user.profile,
    tutorProfile:
      user.tutorProfile == null
        ? null
        : {
            ...user.tutorProfile,
            subjects: user.tutorProfile.subjects.map(({ subject, ...link }) => ({
              ...link,
              subject,
            })),
          },
    tuteeProfile: user.tuteeProfile,
    capabilities: {
      canActAsTutor: user.role ? canActAsTutor(user.role) : false,
      canActAsTutee: user.role ? canActAsTutee(user.role) : false,
    },
  };
}

export async function getCurrentUserProfileData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: currentUserProfileInclude,
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Signed-in user record was not found.");
  }

  return formatCurrentUserProfile(user);
}

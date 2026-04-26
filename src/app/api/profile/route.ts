import { Role } from "@prisma/client";

import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { canActAsTutee, canActAsTutor, requireSessionUser } from "@/lib/permissions";
import { getCurrentUserProfileData } from "@/lib/profile";
import { parseBoolean, parseNumber, parseString, requireObject } from "@/lib/validation";

type ProfilePatchBody = {
  role?: unknown;
  profile?: unknown;
  tutorProfile?: unknown;
  tuteeProfile?: unknown;
};

const CURRENT_YEAR = new Date().getFullYear();

function hasOwnField(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function parseRole(value: unknown) {
  if (value !== Role.TUTOR && value !== Role.TUTEE && value !== Role.BOTH) {
    throw new ApiError(400, "INVALID_INPUT", "role must be TUTOR, TUTEE, or BOTH.");
  }

  return value;
}

function parseNullableStringField(
  source: Record<string, unknown>,
  key: string,
  field: string,
  options: { minLength?: number; maxLength?: number } = {},
) {
  if (!hasOwnField(source, key)) {
    return undefined;
  }

  const value = source[key];

  if (value == null || value === "") {
    return null;
  }

  return parseString(value, {
    field,
    minLength: options.minLength,
    maxLength: options.maxLength,
  });
}

function parseNullableIntegerField(
  source: Record<string, unknown>,
  key: string,
  field: string,
  options: { min?: number; max?: number } = {},
) {
  if (!hasOwnField(source, key)) {
    return undefined;
  }

  const value = source[key];

  if (value == null || value === "") {
    return null;
  }

  return parseNumber(value, {
    field,
    integer: true,
    min: options.min,
    max: options.max,
  });
}

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    return apiOk(await getCurrentUserProfileData(sessionUser.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = requireObject(await readJsonBody<ProfilePatchBody>(request));

    const currentUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        profile: true,
        tutorProfile: true,
        tuteeProfile: true,
      },
    });

    if (!currentUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "Signed-in user record was not found.");
    }

    const nextRole = hasOwnField(body, "role") ? parseRole(body.role) : currentUser.role;

    if (!nextRole) {
      throw new ApiError(400, "INVALID_INPUT", "role must be set for the current user.");
    }

    const profileInput =
      body.profile === undefined ? undefined : requireObject(body.profile, "profile");
    const tutorProfileInput =
      body.tutorProfile === undefined
        ? undefined
        : requireObject(body.tutorProfile, "tutorProfile");
    const tuteeProfileInput =
      body.tuteeProfile === undefined
        ? undefined
        : requireObject(body.tuteeProfile, "tuteeProfile");

    if (tutorProfileInput && !canActAsTutor(nextRole)) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "tutorProfile can only be updated when role allows tutor access.",
      );
    }

    if (tuteeProfileInput && !canActAsTutee(nextRole)) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "tuteeProfile can only be updated when role allows tutee access.",
      );
    }

    const profileUpdate =
      profileInput == null
        ? undefined
        : {
            ...(hasOwnField(profileInput, "fullName")
              ? {
                  fullName: parseString(profileInput.fullName, {
                    field: "profile.fullName",
                    required: true,
                    minLength: 1,
                    maxLength: 100,
                  }),
                }
              : {}),
            ...(hasOwnField(profileInput, "major")
              ? {
                  major: parseNullableStringField(
                    profileInput,
                    "major",
                    "profile.major",
                    { maxLength: 100 },
                  ),
                }
              : {}),
            ...(hasOwnField(profileInput, "bio")
              ? {
                  bio: parseNullableStringField(profileInput, "bio", "profile.bio", {
                    maxLength: 1000,
                  }),
                }
              : {}),
            ...(hasOwnField(profileInput, "school")
              ? {
                  school:
                    parseString(profileInput.school, {
                      field: "profile.school",
                      required: true,
                      minLength: 1,
                      maxLength: 120,
                    }) ?? "New York University",
                }
              : {}),
            ...(hasOwnField(profileInput, "graduationYear")
              ? {
                  graduationYear: parseNullableIntegerField(
                    profileInput,
                    "graduationYear",
                    "profile.graduationYear",
                    { min: 2000, max: CURRENT_YEAR + 10 },
                  ),
                }
              : {}),
            ...(hasOwnField(profileInput, "avatarUrl")
              ? {
                  avatarUrl: parseNullableStringField(
                    profileInput,
                    "avatarUrl",
                    "profile.avatarUrl",
                    { maxLength: 500 },
                  ),
                }
              : {}),
          };

    const tutorProfileUpdate =
      tutorProfileInput == null
        ? undefined
        : {
            ...(hasOwnField(tutorProfileInput, "headline")
              ? {
                  headline: parseNullableStringField(
                    tutorProfileInput,
                    "headline",
                    "tutorProfile.headline",
                    { maxLength: 120 },
                  ),
                }
              : {}),
            ...(hasOwnField(tutorProfileInput, "hourlyRateCents")
              ? {
                  hourlyRateCents: parseNullableIntegerField(
                    tutorProfileInput,
                    "hourlyRateCents",
                    "tutorProfile.hourlyRateCents",
                    { min: 0, max: 100000 },
                  ),
                }
              : {}),
            ...(hasOwnField(tutorProfileInput, "supportsOnline")
              ? {
                  supportsOnline: parseBoolean(
                    tutorProfileInput.supportsOnline,
                    "tutorProfile.supportsOnline",
                  ),
                }
              : {}),
            ...(hasOwnField(tutorProfileInput, "supportsInPerson")
              ? {
                  supportsInPerson: parseBoolean(
                    tutorProfileInput.supportsInPerson,
                    "tutorProfile.supportsInPerson",
                  ),
                }
              : {}),
            ...(hasOwnField(tutorProfileInput, "defaultLocation")
              ? {
                  defaultLocation: parseNullableStringField(
                    tutorProfileInput,
                    "defaultLocation",
                    "tutorProfile.defaultLocation",
                    { maxLength: 120 },
                  ),
                }
              : {}),
            ...(hasOwnField(tutorProfileInput, "availabilityNotes")
              ? {
                  availabilityNotes: parseNullableStringField(
                    tutorProfileInput,
                    "availabilityNotes",
                    "tutorProfile.availabilityNotes",
                    { maxLength: 1000 },
                  ),
                }
              : {}),
          };

    const tuteeProfileUpdate =
      tuteeProfileInput == null
        ? undefined
        : {
            ...(hasOwnField(tuteeProfileInput, "learningGoals")
              ? {
                  learningGoals: parseNullableStringField(
                    tuteeProfileInput,
                    "learningGoals",
                    "tuteeProfile.learningGoals",
                    { maxLength: 1000 },
                  ),
                }
              : {}),
            ...(hasOwnField(tuteeProfileInput, "preferredBudgetCents")
              ? {
                  preferredBudgetCents: parseNullableIntegerField(
                    tuteeProfileInput,
                    "preferredBudgetCents",
                    "tuteeProfile.preferredBudgetCents",
                    { min: 0, max: 100000 },
                  ),
                }
              : {}),
            ...(hasOwnField(tuteeProfileInput, "supportsOnline")
              ? {
                  supportsOnline: parseBoolean(
                    tuteeProfileInput.supportsOnline,
                    "tuteeProfile.supportsOnline",
                  ),
                }
              : {}),
            ...(hasOwnField(tuteeProfileInput, "supportsInPerson")
              ? {
                  supportsInPerson: parseBoolean(
                    tuteeProfileInput.supportsInPerson,
                    "tuteeProfile.supportsInPerson",
                  ),
                }
              : {}),
            ...(hasOwnField(tuteeProfileInput, "availabilityNotes")
              ? {
                  availabilityNotes: parseNullableStringField(
                    tuteeProfileInput,
                    "availabilityNotes",
                    "tuteeProfile.availabilityNotes",
                    { maxLength: 1000 },
                  ),
                }
              : {}),
          };

    await db.$transaction(async (tx) => {
      if (nextRole !== currentUser.role) {
        await tx.user.update({
          where: { id: currentUser.id },
          data: { role: nextRole },
        });
      }

      if (profileUpdate && Object.keys(profileUpdate).length > 0) {
        await tx.profile.upsert({
          where: { userId: currentUser.id },
          update: profileUpdate,
          create: {
            userId: currentUser.id,
            fullName:
              profileUpdate.fullName ??
              currentUser.profile?.fullName ??
              sessionUser.name ??
              currentUser.email,
            major: profileUpdate.major ?? null,
            bio: profileUpdate.bio ?? null,
            school: profileUpdate.school ?? "New York University",
            graduationYear: profileUpdate.graduationYear ?? null,
            avatarUrl: profileUpdate.avatarUrl ?? null,
          },
        });
      }

      if (canActAsTutor(nextRole)) {
        await tx.tutorProfile.upsert({
          where: { userId: currentUser.id },
          update: tutorProfileUpdate ?? {},
          create: {
            userId: currentUser.id,
            headline: tutorProfileUpdate?.headline ?? null,
            hourlyRateCents: tutorProfileUpdate?.hourlyRateCents ?? null,
            supportsOnline: tutorProfileUpdate?.supportsOnline ?? true,
            supportsInPerson: tutorProfileUpdate?.supportsInPerson ?? false,
            defaultLocation: tutorProfileUpdate?.defaultLocation ?? null,
            availabilityNotes: tutorProfileUpdate?.availabilityNotes ?? null,
          },
        });
      }

      if (canActAsTutee(nextRole)) {
        await tx.tuteeProfile.upsert({
          where: { userId: currentUser.id },
          update: tuteeProfileUpdate ?? {},
          create: {
            userId: currentUser.id,
            learningGoals: tuteeProfileUpdate?.learningGoals ?? null,
            preferredBudgetCents: tuteeProfileUpdate?.preferredBudgetCents ?? null,
            supportsOnline: tuteeProfileUpdate?.supportsOnline ?? true,
            supportsInPerson: tuteeProfileUpdate?.supportsInPerson ?? false,
            availabilityNotes: tuteeProfileUpdate?.availabilityNotes ?? null,
          },
        });
      }
    });

    return apiOk(await getCurrentUserProfileData(sessionUser.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

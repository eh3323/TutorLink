import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { VerificationStatus } from "@/lib/enums";
import { canActAsTutor, requireSessionUser } from "@/lib/permissions";

export async function POST() {
  try {
    const sessionUser = await requireSessionUser();

    if (!canActAsTutor(sessionUser.role)) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Only tutor accounts can request verification.",
      );
    }

    const tutorProfile = await db.tutorProfile.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!tutorProfile) {
      throw new ApiError(
        404,
        "TUTOR_PROFILE_NOT_FOUND",
        "Set up your tutor profile before requesting verification.",
      );
    }

    if (tutorProfile.verificationStatus === VerificationStatus.VERIFIED) {
      return apiOk({ verificationStatus: tutorProfile.verificationStatus });
    }

    const updated = await db.tutorProfile.update({
      where: { userId: sessionUser.id },
      data: { verificationStatus: VerificationStatus.PENDING },
      select: { verificationStatus: true },
    });

    return apiOk({ verificationStatus: updated.verificationStatus });
  } catch (error) {
    return handleRouteError(error);
  }
}

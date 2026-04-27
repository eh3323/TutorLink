import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { VerificationStatus } from "@/lib/enums";
import { requireSessionUser } from "@/lib/permissions";
import { parseString, requireObject } from "@/lib/validation";

type VerifyBody = { note?: unknown };

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    const profile = await db.profile.findUnique({
      where: { userId: sessionUser.id },
    });
    if (!profile || !profile.fullName?.trim()) {
      throw new ApiError(
        400,
        "PROFILE_INCOMPLETE",
        "Add your full name in the profile before requesting verification.",
      );
    }

    let note: string | null = null;
    try {
      const raw = await request.json().catch(() => null);
      if (raw && typeof raw === "object") {
        const body = requireObject(raw as VerifyBody);
        note =
          parseString(body.note, {
            field: "note",
            required: false,
            maxLength: 600,
          }) ?? null;
      }
    } catch {
      // ignore body parse errors; note stays null
    }

    const fresh = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { verificationStatus: true },
    });
    if (fresh?.verificationStatus === VerificationStatus.VERIFIED) {
      return apiOk({
        verificationStatus: VerificationStatus.VERIFIED,
        verificationNote: null,
      });
    }

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        verificationNote: note ?? null,
        verificationSubmittedAt: new Date(),
      },
      select: {
        verificationStatus: true,
        verificationNote: true,
        verificationSubmittedAt: true,
      },
    });

    return apiOk(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

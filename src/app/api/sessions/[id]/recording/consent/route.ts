import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

// each side must opt in to recording before it can start. tutors and tutees
// have separate timestamp columns; this route just stamps the caller's side.
export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const session = await db.session.findUnique({
      where: { id },
      select: {
        id: true,
        tutorId: true,
        tuteeId: true,
        recordingConsentTutorAt: true,
        recordingConsentTuteeAt: true,
      },
    });
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
    }
    if (
      sessionUser.id !== session.tutorId &&
      sessionUser.id !== session.tuteeId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Not a participant.");
    }

    const isTutor = sessionUser.id === session.tutorId;
    const updated = await db.session.update({
      where: { id: session.id },
      data: isTutor
        ? { recordingConsentTutorAt: new Date() }
        : { recordingConsentTuteeAt: new Date() },
      select: {
        recordingConsentTutorAt: true,
        recordingConsentTuteeAt: true,
      },
    });

    return apiOk({
      tutorConsentedAt: updated.recordingConsentTutorAt,
      tuteeConsentedAt: updated.recordingConsentTuteeAt,
      bothConsented:
        Boolean(updated.recordingConsentTutorAt) &&
        Boolean(updated.recordingConsentTuteeAt),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// withdraw consent (only your own side)
export async function DELETE(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const session = await db.session.findUnique({
      where: { id },
      select: { id: true, tutorId: true, tuteeId: true },
    });
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
    }
    if (
      sessionUser.id !== session.tutorId &&
      sessionUser.id !== session.tuteeId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Not a participant.");
    }
    const isTutor = sessionUser.id === session.tutorId;
    const updated = await db.session.update({
      where: { id: session.id },
      data: isTutor
        ? { recordingConsentTutorAt: null }
        : { recordingConsentTuteeAt: null },
      select: {
        recordingConsentTutorAt: true,
        recordingConsentTuteeAt: true,
      },
    });
    return apiOk({
      tutorConsentedAt: updated.recordingConsentTutorAt,
      tuteeConsentedAt: updated.recordingConsentTuteeAt,
      bothConsented: false,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

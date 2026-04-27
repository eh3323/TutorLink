import { AccessToken } from "livekit-server-sdk";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

// gives the signed-in participant a short-lived JWT for this specific session's
// livekit room. only confirmed sessions during their live window get a token.
// if the env isn't configured we tell the client so it can fall back to jitsi.
export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id: sessionId } = await context.params;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !url) {
      throw new ApiError(
        503,
        "LIVEKIT_NOT_CONFIGURED",
        "LiveKit is not configured on this server. Falling back to Jitsi.",
      );
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        tutorId: true,
        tuteeId: true,
        roomToken: true,
        scheduledAt: true,
        durationMinutes: true,
        status: true,
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
    if (session.status !== "CONFIRMED") {
      throw new ApiError(
        400,
        "INVALID_STATE",
        `Cannot join a ${session.status.toLowerCase()} session.`,
      );
    }
    const now = Date.now();
    const opensAt = session.scheduledAt.getTime() - 15 * 60_000;
    const closesAt = session.scheduledAt.getTime() + session.durationMinutes * 60_000 + 30 * 60_000;
    if (now < opensAt || now > closesAt) {
      throw new ApiError(
        400,
        "ROOM_CLOSED",
        "Session room is not open right now.",
      );
    }

    const roomName = `tutorlink-${session.id}-${session.roomToken}`;
    const profile = await db.profile.findUnique({
      where: { userId: sessionUser.id },
      select: { fullName: true },
    });
    const displayName = profile?.fullName ?? sessionUser.email ?? "participant";

    const at = new AccessToken(apiKey, apiSecret, {
      identity: sessionUser.id,
      name: displayName,
      // tokens are valid for the full live window (~ duration + 45m)
      ttl: Math.max(900, Math.floor((closesAt - now) / 1000)),
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();

    return apiOk({
      token,
      url,
      roomName,
      identity: sessionUser.id,
      displayName,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

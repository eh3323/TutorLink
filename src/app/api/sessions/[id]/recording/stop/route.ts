import { EgressClient, EgressStatus } from "livekit-server-sdk";

import { ApiError, apiOk, handleRouteError, readJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

type Body = { egressId?: unknown };

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    const body = (await readJsonBody<Body>(request)) ?? {};
    const egressIdRaw = typeof body.egressId === "string" ? body.egressId : "";

    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new ApiError(
        503,
        "LIVEKIT_NOT_CONFIGURED",
        "Recording requires LiveKit env vars on the server.",
      );
    }

    const session = await db.session.findUnique({
      where: { id },
      select: { id: true, tutorId: true, tuteeId: true, roomToken: true },
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

    const egress = new EgressClient(url, apiKey, apiSecret);
    let egressId = egressIdRaw;
    if (!egressId) {
      // best-effort: list active egress for this room and pick the newest
      const roomName = `tutorlink-${session.id}-${session.roomToken}`;
      const list = await egress.listEgress({ roomName, active: true });
      if (list.length === 0) {
        throw new ApiError(404, "NO_ACTIVE_RECORDING", "No active recording for this session.");
      }
      egressId = list[0].egressId;
    }
    await egress.stopEgress(egressId);

    // poll briefly so we can capture the final file location if the egress
    // wraps up quickly. on a real load you'd hand this off to a worker.
    let location: string | null = null;
    for (let i = 0; i < 6; i++) {
      const list = await egress.listEgress({});
      const info = list.find((e) => e.egressId === egressId);
      if (info && info.status === EgressStatus.EGRESS_COMPLETE) {
        location = info.fileResults?.[0]?.location ?? null;
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    await db.session.update({
      where: { id: session.id },
      data: {
        recordingEndedAt: new Date(),
        recordingUrl: location ?? undefined,
      },
    });

    return apiOk({ egressId, location });
  } catch (error) {
    return handleRouteError(error);
  }
}

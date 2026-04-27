import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

// kicks off a livekit room composite egress to s3. requires:
//   * LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET (already required by token route)
//   * LIVEKIT_S3_BUCKET / LIVEKIT_S3_REGION / LIVEKIT_S3_ACCESS_KEY / LIVEKIT_S3_SECRET (or AWS_*)
//   * both sides must have consented
// without those, the api returns a clear 503 so the ui can hide / re-explain.
export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

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

    const bucket = process.env.LIVEKIT_S3_BUCKET ?? process.env.AWS_S3_BUCKET;
    const region = process.env.LIVEKIT_S3_REGION ?? process.env.AWS_REGION;
    const accessKey =
      process.env.LIVEKIT_S3_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID;
    const secret =
      process.env.LIVEKIT_S3_SECRET ?? process.env.AWS_SECRET_ACCESS_KEY;
    if (!bucket || !region || !accessKey || !secret) {
      throw new ApiError(
        503,
        "RECORDING_STORAGE",
        "Recording storage is not configured (LIVEKIT_S3_* env vars).",
      );
    }

    const session = await db.session.findUnique({
      where: { id },
      select: {
        id: true,
        tutorId: true,
        tuteeId: true,
        roomToken: true,
        status: true,
        recordingConsentTutorAt: true,
        recordingConsentTuteeAt: true,
        recordingStartedAt: true,
        recordingEndedAt: true,
        recordingUrl: true,
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
        "Only confirmed sessions can be recorded.",
      );
    }
    if (!session.recordingConsentTutorAt || !session.recordingConsentTuteeAt) {
      throw new ApiError(
        400,
        "CONSENT_REQUIRED",
        "Both participants must consent before recording.",
      );
    }
    if (session.recordingStartedAt && !session.recordingEndedAt) {
      throw new ApiError(409, "ALREADY_RUNNING", "Recording already running.");
    }

    const roomName = `tutorlink-${session.id}-${session.roomToken}`;
    const filename = `tutorlink/${session.id}-${Date.now()}.mp4`;
    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: filename,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey,
          secret,
          bucket,
          region,
        }),
      },
    });

    const egress = new EgressClient(url, apiKey, apiSecret);
    const info = await egress.startRoomCompositeEgress(roomName, {
      file: fileOutput,
    });

    await db.session.update({
      where: { id: session.id },
      data: {
        recordingStartedAt: new Date(),
        recordingEndedAt: null,
        recordingUrl: null,
      },
    });

    return apiOk({
      egressId: info.egressId,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

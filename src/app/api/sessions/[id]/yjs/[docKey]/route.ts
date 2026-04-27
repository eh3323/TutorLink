import { NextResponse } from "next/server";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string; docKey: string }> };

const ALLOWED_DOC_KEYS = new Set(["code", "whiteboard"]);
// hard cap so a runaway client can't fill the table
const MAX_PAYLOAD_BYTES = 1024 * 64;

async function assertParticipant(userId: string, sessionId: string) {
  const s = await db.session.findUnique({
    where: { id: sessionId },
    select: { id: true, tutorId: true, tuteeId: true, status: true },
  });
  if (!s) throw new ApiError(404, "SESSION_NOT_FOUND", "Session not found.");
  if (userId !== s.tutorId && userId !== s.tuteeId) {
    throw new ApiError(403, "FORBIDDEN", "Not a participant.");
  }
  return s;
}

// POST: append a single y.doc update for this session/doc.
// body: raw bytes (application/octet-stream) or { payload: base64 } json.
export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id, docKey } = await context.params;
    if (!ALLOWED_DOC_KEYS.has(docKey)) {
      throw new ApiError(400, "INVALID_INPUT", "Unknown doc key.");
    }
    await assertParticipant(sessionUser.id, id);

    const contentType = request.headers.get("content-type") ?? "";
    let payload: Buffer | null = null;
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { payload?: string };
      if (typeof body?.payload === "string") {
        payload = Buffer.from(body.payload, "base64");
      }
    } else {
      const ab = await request.arrayBuffer();
      payload = Buffer.from(ab);
    }

    if (!payload || payload.byteLength === 0) {
      throw new ApiError(400, "INVALID_INPUT", "Empty payload.");
    }
    if (payload.byteLength > MAX_PAYLOAD_BYTES) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Update too large.");
    }

    const op = await db.yjsOp.create({
      data: { sessionId: id, docKey, payload },
      select: { id: true, createdAt: true },
    });
    return apiOk({
      id: op.id,
      createdAt: op.createdAt.toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// GET: return updates strictly newer than ?after=ISO. clients merge them
// locally; ordering doesn't matter because Y.Doc updates are CRDT.
export async function GET(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id, docKey } = await context.params;
    if (!ALLOWED_DOC_KEYS.has(docKey)) {
      throw new ApiError(400, "INVALID_INPUT", "Unknown doc key.");
    }
    await assertParticipant(sessionUser.id, id);

    const url = new URL(request.url);
    const afterRaw = url.searchParams.get("after");
    const limit = Math.min(
      500,
      Number.parseInt(url.searchParams.get("limit") ?? "200", 10) || 200,
    );

    let afterDate: Date | undefined;
    if (afterRaw) {
      const t = Date.parse(afterRaw);
      if (Number.isFinite(t)) afterDate = new Date(t);
    }

    const ops = await db.yjsOp.findMany({
      where: {
        sessionId: id,
        docKey,
        ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, payload: true, createdAt: true },
    });

    const items = ops.map((op) => ({
      id: op.id,
      createdAt: op.createdAt.toISOString(),
      payload: Buffer.from(op.payload).toString("base64"),
    }));
    const nextAfter =
      items.length > 0 ? items[items.length - 1].createdAt : afterRaw ?? null;

    return apiOk({ items, nextAfter });
  } catch (error) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL", message: String(error) } },
      { status: 500 },
    );
  }
}

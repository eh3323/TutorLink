import { handleRouteError } from "@/lib/api";
import { buildIcs, getSessionDetailForUser } from "@/lib/sessions";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    const detail = await getSessionDetailForUser(sessionUser, id);
    const origin = new URL(request.url).origin;
    const joinUrl = `${origin}/sessions/${detail.id}/room`;

    const ics = buildIcs(
      {
        id: detail.id,
        scheduledAt: new Date(detail.scheduledAt as unknown as string),
        durationMinutes: detail.durationMinutes,
        subject: detail.subject,
        participants: detail.participants,
        locationText: detail.locationText,
        notes: detail.notes,
        mode: detail.mode,
        roomToken: detail.roomToken,
      },
      joinUrl,
    );

    return new Response(ics, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="tutorlink-${detail.id}.ics"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

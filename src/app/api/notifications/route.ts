import { apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const threads = await db.messageThread.findMany({
      where: {
        OR: [{ tutorId: sessionUser.id }, { tuteeId: sessionUser.id }],
        updatedAt: { gte: since },
      },
      select: {
        id: true,
        updatedAt: true,
        tutorId: true,
        tuteeId: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            senderId: true,
            createdAt: true,
            body: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadThreads = threads.filter((thread) => {
      const latest = thread.messages[0];
      return latest && latest.senderId !== sessionUser.id;
    });

    const recent = unreadThreads.slice(0, 5).map((thread) => {
      const latest = thread.messages[0];
      return {
        threadId: thread.id,
        snippet: latest?.body.slice(0, 120) ?? "",
        createdAt: latest?.createdAt ?? thread.updatedAt,
      };
    });

    return apiOk({
      unreadCount: unreadThreads.length,
      recent,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

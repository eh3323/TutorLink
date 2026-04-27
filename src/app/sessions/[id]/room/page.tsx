import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionDetailForUser, isSessionLive } from "@/lib/sessions";
import { SessionRoom } from "./session-room";

export default async function SessionRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getSessionDetailForUser>> | null = null;
  try {
    detail = await getSessionDetailForUser(session.user, id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  if (detail.status !== "CONFIRMED") {
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-white">Room is not available</h1>
          <p className="text-sm text-slate-400">
            This session is {detail.status.toLowerCase()}. The session room is
            only open after both sides accept.
          </p>
          <Link
            href={`/sessions/${detail.id}`}
            className="mx-auto inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Back to session
          </Link>
        </div>
      </main>
    );
  }

  const scheduledAt = new Date(detail.scheduledAt as unknown as string);
  if (!isSessionLive(scheduledAt, detail.durationMinutes)) {
    const now = Date.now();
    const opensAt = scheduledAt.getTime() - 15 * 60_000;
    const closedAt = scheduledAt.getTime() + detail.durationMinutes * 60_000 + 30 * 60_000;
    const message =
      now < opensAt
        ? `Room opens 15 minutes before the session at ${scheduledAt.toLocaleString()}.`
        : `Room closed at ${new Date(closedAt).toLocaleString()}.`;
    return (
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-white">Room is closed</h1>
          <p className="text-sm text-slate-400">{message}</p>
          <Link
            href={`/sessions/${detail.id}`}
            className="mx-auto inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Back to session
          </Link>
        </div>
      </main>
    );
  }

  // make sure there's a thread to chat in; otherwise spin one up on the fly
  let threadId = detail.thread?.id ?? null;
  if (!threadId) {
    const existing = await db.messageThread.findFirst({
      where: {
        tutorId: detail.participants.tutor.id,
        tuteeId: detail.participants.tutee.id,
      },
      select: { id: true },
    });
    if (existing) {
      threadId = existing.id;
    } else {
      const created = await db.messageThread.create({
        data: {
          tutorId: detail.participants.tutor.id,
          tuteeId: detail.participants.tutee.id,
        },
        select: { id: true },
      });
      threadId = created.id;
    }
    await db.session.update({
      where: { id: detail.id },
      data: { threadId },
    });
  }

  const me = detail.viewerRole === "TUTOR" ? detail.participants.tutor : detail.participants.tutee;
  const counterpart = detail.counterpart;

  return (
    <SessionRoom
      sessionId={detail.id}
      threadId={threadId}
      roomToken={detail.roomToken}
      scheduledAtIso={scheduledAt.toISOString()}
      durationMinutes={detail.durationMinutes}
      subjectLabel={`${detail.subject.department} ${detail.subject.code} · ${detail.subject.name}`}
      me={{
        id: me.id,
        fullName: me.fullName,
        email: me.email,
        avatarUrl: me.avatarUrl,
      }}
      counterpart={{
        id: counterpart.id,
        fullName: counterpart.fullName,
        avatarUrl: counterpart.avatarUrl,
      }}
    />
  );
}

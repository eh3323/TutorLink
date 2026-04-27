import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getThreadDetailForUser } from "@/lib/messages";
import { listSubjects } from "@/lib/requests";
import { ThreadView } from "./thread-view";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getThreadDetailForUser>> | null = null;
  try {
    detail = await getThreadDetailForUser(session.user, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) notFound();
    throw error;
  }

  const subjects = await listSubjects();

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-10">
        <Link href="/messages" className="text-xs text-slate-400 hover:text-white">
          ← All messages
        </Link>
        <ThreadView
          threadId={detail.thread.id}
          initialMessages={detail.messages as unknown as Parameters<typeof ThreadView>[0]["initialMessages"]}
          participants={detail.thread.participants}
          currentUserId={session.user.id}
          request={detail.thread.request as Parameters<typeof ThreadView>[0]["request"]}
          subjects={subjects}
        />
      </div>
    </main>
  );
}

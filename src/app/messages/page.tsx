import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/format";
import { listThreadsForUser } from "@/lib/messages";

export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/messages");
  }

  const threads = await listThreadsForUser(session.user);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Inbox
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Messages</h1>
            <p className="mt-2 text-sm text-slate-400">
              Every conversation you have with a tutor or tutee lives here.
            </p>
          </div>
          <Link
            href="/tutors"
            className="hidden rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 sm:block"
          >
            Message a new tutor
          </Link>
        </section>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <p className="text-base font-medium text-white">No conversations yet.</p>
            <p className="mt-2 text-sm text-slate-400">
              Open a tutor profile or request and press <em>Message</em> to start a thread.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/tutors"
                className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Browse tutors
              </Link>
              <Link
                href="/requests"
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                See requests
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {threads.map((thread, index) => (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className={`flex items-center gap-4 p-4 transition hover:bg-white/5 ${
                  index === 0 ? "" : "border-t border-white/5"
                }`}
              >
                <Avatar
                  name={thread.counterpart.fullName}
                  src={thread.counterpart.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate text-sm font-semibold text-white"
                      title="Click the row to open the conversation. Tap their name inside to view their profile."
                    >
                      {thread.counterpart.fullName}
                    </p>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-300">
                      You as {thread.viewerRole === "TUTOR" ? "tutor" : "tutee"}
                    </span>
                    {thread.request ? (
                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-cyan-200">
                        {thread.request.subject.department} {thread.request.subject.code}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {thread.latestMessage ? thread.latestMessage.body : "No messages yet"}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {formatRelativeTime(thread.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

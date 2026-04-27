import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import {
  formatCurrencyCents,
  formatDateTime,
  formatMode,
  formatStatusLabel,
} from "@/lib/format";
import { listSessionsForUser } from "@/lib/sessions";
import { NewSessionButton } from "./new-session-button";

export default async function SessionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/sessions");
  }

  const sessions = await listSessionsForUser(session.user);

  const upcoming = sessions.filter(
    (s) => s.status === "PENDING" || s.status === "CONFIRMED",
  );
  const past = sessions.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED");

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Sessions
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Your tutoring sessions</h1>
            <p className="mt-2 text-sm text-slate-400">
              Confirm, complete, or cancel sessions here. Leave a review once a session is
              complete.
            </p>
          </div>
          <NewSessionButton />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
              No upcoming sessions. Message a tutor to schedule one.
            </div>
          ) : (
            <div className="grid gap-3">
              {upcoming.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Past
          </h2>
          {past.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
              Past sessions will show up here.
            </div>
          ) : (
            <div className="grid gap-3">
              {past.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SessionCard({
  session,
}: {
  session: Awaited<ReturnType<typeof listSessionsForUser>>[number];
}) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/40 hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={session.counterpart.fullName}
          src={session.counterpart.avatarUrl}
          size="md"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            {session.subject.department} {session.subject.code}
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            With {session.counterpart.fullName}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min ·{" "}
            {formatMode(session.mode)}
            {session.locationText ? ` · ${session.locationText}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        {session.agreedRateCents != null ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            {formatCurrencyCents(session.agreedRateCents)}/hr
          </span>
        ) : null}
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            session.status === "CONFIRMED"
              ? "bg-emerald-400/15 text-emerald-200"
              : session.status === "COMPLETED"
                ? "bg-cyan-400/15 text-cyan-200"
                : session.status === "CANCELLED"
                  ? "bg-rose-400/15 text-rose-200"
                  : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {formatStatusLabel(session.status)}
        </span>
      </div>
    </Link>
  );
}

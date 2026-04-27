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

  const incoming = sessions.filter((s) => s.status === "PENDING" && !s.viewerIsProposer);
  const outgoing = sessions.filter((s) => s.status === "PENDING" && s.viewerIsProposer);
  const confirmed = sessions
    .filter((s) => s.status === "CONFIRMED")
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as unknown as string).getTime() -
        new Date(b.scheduledAt as unknown as string).getTime(),
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
            <h1 className="mt-1 text-3xl font-semibold text-white">
              Your tutoring sessions
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sessions only become real once both sides accept. Cancel any time
              before the session ends.
            </p>
          </div>
          <NewSessionButton />
        </section>

        <Bucket
          title="Awaiting your decision"
          subtitle="Someone proposed a session — accept or decline."
          empty="Nothing waiting on you."
          items={incoming}
          tone="amber"
        />

        <Bucket
          title="Waiting on the other side"
          subtitle="You proposed these. They'll show up under confirmed once accepted."
          empty="No outstanding proposals."
          items={outgoing}
          tone="slate"
        />

        <Bucket
          title="Upcoming"
          subtitle="Both sides agreed. Add them to your calendar and join the session room when it starts."
          empty="No confirmed sessions yet."
          items={confirmed}
          tone="emerald"
        />

        <Bucket
          title="Past"
          subtitle=""
          empty="Past sessions will show up here."
          items={past}
          tone="muted"
        />
      </div>
    </main>
  );
}

type SessionItem = Awaited<ReturnType<typeof listSessionsForUser>>[number];

function Bucket({
  title,
  subtitle,
  empty,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  empty: string;
  items: SessionItem[];
  tone: "amber" | "slate" | "emerald" | "muted";
}) {
  const accent =
    tone === "amber"
      ? "text-amber-300"
      : tone === "emerald"
        ? "text-emerald-300"
        : tone === "muted"
          ? "text-slate-400"
          : "text-slate-300";

  return (
    <section className="space-y-3">
      <div>
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${accent}`}>
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function SessionCard({ session }: { session: SessionItem }) {
  const tag =
    session.status === "PENDING" && session.viewerIsProposer
      ? "Outgoing proposal"
      : session.status === "PENDING"
        ? "Awaiting you"
        : formatStatusLabel(session.status);

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
          {tag}
        </span>
      </div>
    </Link>
  );
}

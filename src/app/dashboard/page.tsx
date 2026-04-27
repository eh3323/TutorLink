import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatCurrencyCents,
  formatDateTime,
  formatMode,
  formatRelativeTime,
  formatStatusLabel,
} from "@/lib/format";
import { getCurrentUserProfileData } from "@/lib/profile";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const profileData = await getCurrentUserProfileData(session.user.id);
  const { user, profile, tutorProfile, tuteeProfile, capabilities } = profileData;

  const [upcomingSessions, recentThreads, myRequests] = await Promise.all([
    db.session.findMany({
      where: {
        OR: [{ tutorId: user.id }, { tuteeId: user.id }],
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        subject: true,
        tutor: { include: { profile: true } },
        tutee: { include: { profile: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 4,
    }),
    db.messageThread.findMany({
      where: { OR: [{ tutorId: user.id }, { tuteeId: user.id }] },
      include: {
        tutor: { include: { profile: true } },
        tutee: { include: { profile: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    capabilities.canActAsTutee
      ? db.tutoringRequest.findMany({
          where: { tuteeId: user.id },
          include: { subject: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const displayName = profile?.fullName ?? user.email;
  const roleLabel = user.role === "BOTH" ? "Tutor + Tutee" : user.role ?? "Role not set";

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={displayName}
              src={profile?.avatarUrl ?? null}
              size="lg"
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Welcome back</p>
              <h1 className="text-3xl font-semibold text-white">{displayName}</h1>
              <p className="text-sm text-slate-400">
                {user.email} · {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/profile"
              className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
            >
              Edit profile
            </Link>
            <Link
              href="/tutors"
              className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Find a tutor
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Upcoming sessions
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {upcomingSessions.length}
            </p>
            <Link href="/sessions" className="mt-2 block text-xs text-cyan-300 hover:text-cyan-200">
              Manage sessions →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active threads
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">{recentThreads.length}</p>
            <Link href="/messages" className="mt-2 block text-xs text-cyan-300 hover:text-cyan-200">
              Open messages →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Capabilities
            </p>
            <p className="mt-2 text-sm text-white">
              Tutor: {capabilities.canActAsTutor ? "✓" : "—"} · Tutee:{" "}
              {capabilities.canActAsTutee ? "✓" : "—"}
            </p>
            <Link href="/profile" className="mt-2 block text-xs text-cyan-300 hover:text-cyan-200">
              Change role →
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upcoming sessions</h2>
              <Link href="/sessions" className="text-xs text-cyan-300 hover:text-cyan-200">
                All sessions
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingSessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-400">
                  No sessions scheduled yet. Start by messaging a tutor and proposing a time.
                </p>
              ) : (
                upcomingSessions.map((s) => {
                  const counterpart =
                    s.tutorId === user.id
                      ? s.tutee.profile?.fullName ?? s.tutee.email
                      : s.tutor.profile?.fullName ?? s.tutor.email;
                  return (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-3 hover:border-cyan-400/40 hover:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {s.subject.department} {s.subject.code} with {counterpart}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(s.scheduledAt)} · {formatMode(s.mode)}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">
                        {formatStatusLabel(s.status)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent conversations</h2>
              <Link href="/messages" className="text-xs text-cyan-300 hover:text-cyan-200">
                All messages
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentThreads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-400">
                  No messages yet. Open a tutor profile and click Message to start a thread.
                </p>
              ) : (
                recentThreads.map((thread) => {
                  const isTutor = thread.tutorId === user.id;
                  const counterpart = isTutor ? thread.tutee : thread.tutor;
                  const name = counterpart.profile?.fullName ?? counterpart.email;
                  const last = thread.messages[0];
                  return (
                    <Link
                      key={thread.id}
                      href={`/messages/${thread.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 hover:border-cyan-400/40 hover:bg-slate-900"
                    >
                      <Avatar
                        name={name}
                        src={counterpart.profile?.avatarUrl ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {last ? last.body : "No messages yet"}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {formatRelativeTime(thread.updatedAt)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {capabilities.canActAsTutor && tutorProfile ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your tutor profile</h2>
              <Link href="/profile" className="text-xs text-cyan-300 hover:text-cyan-200">
                Edit tutor profile
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Headline</p>
                <p className="mt-1 text-sm text-white">{tutorProfile.headline ?? "Not set"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Hourly rate</p>
                <p className="mt-1 text-sm text-white">
                  {tutorProfile.hourlyRateCents != null
                    ? `${formatCurrencyCents(tutorProfile.hourlyRateCents)}/hr`
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Verification</p>
                <p className="mt-1 text-sm text-white">
                  {formatStatusLabel(tutorProfile.verificationStatus)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {capabilities.canActAsTutee && myRequests.length > 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your tutoring requests</h2>
              <Link href="/requests/new" className="text-xs text-cyan-300 hover:text-cyan-200">
                New request
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {myRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-sm font-semibold text-white">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.subject.department} {r.subject.code} · {formatStatusLabel(r.status)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tuteeProfile && capabilities.canActAsTutee ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your tutee profile</h2>
              <Link href="/profile" className="text-xs text-cyan-300 hover:text-cyan-200">
                Edit tutee profile
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Learning goals</p>
                <p className="mt-1 text-sm text-white">{tuteeProfile.learningGoals ?? "Not set"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Preferred budget</p>
                <p className="mt-1 text-sm text-white">
                  {tuteeProfile.preferredBudgetCents != null
                    ? `${formatCurrencyCents(tuteeProfile.preferredBudgetCents)} target`
                    : "Not set"}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

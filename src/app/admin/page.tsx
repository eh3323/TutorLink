import Link from "next/link";

import { getAdminStats } from "@/lib/admin";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Users", value: stats.userCount },
    { label: "Tutors", value: stats.tutorCount },
    { label: "Tutees", value: stats.tuteeCount },
    { label: "Admins", value: stats.adminCount },
    { label: "Suspended", value: stats.suspendedCount },
    { label: "Pending verification", value: stats.pendingVerification, href: "/admin/verifications?status=PENDING" },
    { label: "Requests", value: stats.requestCount, href: "/admin/requests" },
    { label: "Open requests", value: stats.openRequestCount, href: "/admin/requests" },
    { label: "Threads", value: stats.threadCount },
    { label: "Sessions", value: stats.sessionCount, href: "/admin/sessions" },
    { label: "Upcoming sessions", value: stats.upcomingSessions },
    { label: "Completed sessions", value: stats.completedSessions },
    { label: "Reviews", value: stats.reviewCount },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Overview
        </p>
        <h1 className="text-2xl font-semibold text-white">Platform health</h1>
        <p className="text-sm text-slate-400">
          A snapshot of what's live on TutorLink right now.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {c.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{c.value}</p>
            </>
          );
          if (c.href) {
            return (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 transition hover:border-amber-400/50 hover:bg-amber-400/10"
              >
                {body}
              </Link>
            );
          }
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              {body}
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 transition hover:border-amber-400/50 hover:bg-amber-400/10"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Users
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Search, suspend, promote</h2>
          <p className="mt-2 text-sm text-slate-400">
            Manage who can log in, switch roles, and grant admin rights.
          </p>
        </Link>
        <Link
          href="/admin/verifications?status=PENDING"
          className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 transition hover:border-amber-400/50 hover:bg-amber-400/10"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Identity verification
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {stats.pendingVerification} accounts waiting
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Approve or reject submissions from any tutor or tutee.
          </p>
        </Link>
      </section>
    </div>
  );
}

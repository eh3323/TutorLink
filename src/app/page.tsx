import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  const stack = [
    "Next.js App Router",
    "TypeScript",
    "Tailwind CSS v4",
    "PostgreSQL",
    "Prisma",
    "NextAuth credentials auth",
  ];

  const flows = [
    "Student signs up with an @nyu.edu email",
    "Student creates a tutor or tutee profile",
    "Tutee browses tutors by subject, schedule, and budget",
    "Users exchange messages and confirm a session",
  ];

  const nextSteps = [
    "Build profile read and update routes",
    "Add role-aware onboarding after sign-in",
    "Define tutor, request, message, and session contracts",
    "Start the marketplace pages on top of the current auth and DB layer",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 lg:px-10">
        <section className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="rounded bg-cyan-400/15 px-2 py-1 font-medium text-cyan-200">
                NYU CS Design Project
              </span>
              <span>Web foundation, database, and auth initialized</span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white">
                TutorLink
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                A peer-to-peer tutoring marketplace for NYU students. This web
                project now has a live web foundation, Prisma data model, and a
                working first-pass NYU auth flow.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Stack
              </p>
              <p className="mt-2 text-lg font-semibold text-white">Web MVP</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Audience
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                NYU Students
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Next Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Profile + Marketplace
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">
              {session?.user
                ? `Signed in as ${session.user.email}`
                : "No active session"}
            </p>
            <p className="text-sm leading-6 text-slate-400">
              {session?.user
                ? `Current role: ${session.user.role}`
                : "Use the development sign-in flow to create or access an account."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Open dashboard
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/signin"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Chosen Stack
            </h2>
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {stack.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Core User Flow
            </h2>
            <ol className="space-y-3 text-sm leading-6 text-slate-200">
              {flows.map((item, index) => (
                <li
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="mr-2 font-semibold text-cyan-200">
                    {index + 1}.
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Immediate Next Steps
            </h2>
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {nextSteps.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Repository Docs
            </h2>
            <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
                `PROJECT_TASK_BREAKDOWN.md`
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
                `TEAM_ROLE_ASSIGNMENT.md`
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
                `TutorLink_SSDS_Requirements_Analysis (2).docx`
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Today&apos;s Goal
            </h2>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm leading-6 text-cyan-50">
              Move from auth foundation into profile APIs, onboarding, and the
              first tutor marketplace pages.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  const stack = [
    "Next.js App Router",
    "TypeScript",
    "Tailwind CSS v4",
    "PostgreSQL",
    "Prisma",
    "NextAuth or equivalent auth layer",
  ];

  const flows = [
    "Student signs up with an @nyu.edu email",
    "Student creates a tutor or tutee profile",
    "Tutee browses tutors by subject, schedule, and budget",
    "Users exchange messages and confirm a session",
  ];

  const nextSteps = [
    "Design the MVP database schema",
    "Add Prisma and the first migration",
    "Set up auth and NYU email restriction",
    "Define profile, tutor, message, and session contracts",
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
              <span>Web foundation initialized</span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white">
                TutorLink
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                A peer-to-peer tutoring marketplace for NYU students. This web
                project is now set up to move into database design,
                authentication, and marketplace feature development.
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
                Schema + Auth
              </p>
            </div>
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
                `PROJECT_LEAD_TASK_DECOMPOSITION.md`
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
              Finish the web foundation, then move directly into Prisma schema
              design and the first database migration.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

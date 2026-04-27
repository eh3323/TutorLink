import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrencyCents, formatRating } from "@/lib/format";

export default async function Home() {
  const session = await auth();

  const [featuredTutors, stats] = await Promise.all([
    db.user.findMany({
      where: {
        role: { in: ["TUTOR", "BOTH"] },
        profile: { isNot: null },
        tutorProfile: { isNot: null },
      },
      include: {
        profile: true,
        tutorProfile: {
          include: { subjects: { include: { subject: true } } },
        },
        receivedReviews: { select: { rating: true } },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    Promise.all([
      db.user.count({ where: { role: { in: ["TUTOR", "BOTH"] } } }),
      db.tutoringRequest.count({ where: { status: "OPEN" } }),
      db.subject.count(),
    ]),
  ]);

  const [tutorCount, openRequests, subjectCount] = stats;

  const valueProps = [
    {
      title: "Subject search that feels natural",
      body: "Filter by department, course code, or topic. See rates, availability, and reviews at a glance.",
    },
    {
      title: "Message tutors directly",
      body: "No email tag. Start a thread from any tutor or request, chat in-app, and build a real plan together.",
    },
    {
      title: "Plan real sessions",
      body: "Confirm time, location or Zoom, and rate. Update status through the session lifecycle.",
    },
  ];

  const howItWorks = [
    { num: "1", title: "Sign in with your @nyu.edu email", body: "We only let the NYU community in." },
    { num: "2", title: "Pick tutor, tutee, or both", body: "You can always flip later." },
    { num: "3", title: "Find or post tutoring help", body: "Browse the marketplace or post your need." },
    { num: "4", title: "Message, book, review", body: "Run the full flow inside TutorLink." },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-24">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              NYU peer tutoring marketplace
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find the NYU tutor who actually{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                gets it.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              TutorLink connects NYU students with peer tutors from their own school.
              Search by subject, see real reviews, message directly, and book tutoring
              sessions — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tutors"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Browse tutors
              </Link>
              {session?.user ? (
                <Link
                  href="/requests/new"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Post a request
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Create account
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-slate-400">
              <div>
                <p className="text-2xl font-semibold text-white">{tutorCount}</p>
                <p>peer tutors</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{subjectCount}</p>
                <p>supported courses</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{openRequests}</p>
                <p>open requests</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-500/5 backdrop-blur">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Featured tutors
              </p>
              <div className="mt-3 space-y-3">
                {featuredTutors.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    No tutors yet. Run <code>npm run prisma:seed</code> to load demo
                    tutors.
                  </p>
                ) : (
                  featuredTutors.map((tutor) => {
                    const fullName = tutor.profile?.fullName ?? tutor.email;
                    const rate = formatCurrencyCents(tutor.tutorProfile?.hourlyRateCents);
                    const averageRating =
                      tutor.receivedReviews.length === 0
                        ? null
                        : Number(
                            (
                              tutor.receivedReviews.reduce((sum, r) => sum + r.rating, 0) /
                              tutor.receivedReviews.length
                            ).toFixed(1),
                          );
                    const primarySubjects = tutor.tutorProfile?.subjects.slice(0, 2) ?? [];
                    return (
                      <Link
                        key={tutor.id}
                        href={`/tutors/${tutor.id}`}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/40 hover:bg-slate-900"
                      >
                        <Avatar
                          name={fullName}
                          src={tutor.profile?.avatarUrl ?? null}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {fullName}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {tutor.tutorProfile?.headline ??
                              primarySubjects
                                .map((s) => `${s.subject.department} ${s.subject.code}`)
                                .join(" · ")}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          {rate ? (
                            <p className="font-semibold text-white">{rate}/hr</p>
                          ) : (
                            <p className="text-slate-400">Open rate</p>
                          )}
                          <p className="text-slate-400">{formatRating(averageRating)}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
              <Link
                href="/tutors"
                className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 py-2 text-xs font-medium text-cyan-200 hover:bg-white/5"
              >
                See all tutors →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {valueProps.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-3 pb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              How it works
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              From a search to a confirmed session in four steps.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {howItWorks.map((step) => (
              <div
                key={step.num}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">
                  {step.num}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-start gap-4 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-violet-500/10 p-8 text-left sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Ready to get your first session?
              </h3>
              <p className="mt-2 max-w-lg text-sm text-slate-300">
                Sign in with your NYU email and start browsing, messaging, or posting a
                tutoring request in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </>
              )}
              <Link
                href="/tutors"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                Browse tutors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

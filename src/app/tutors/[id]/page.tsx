import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import {
  formatCurrencyCents,
  formatDate,
  formatRating,
  formatStatusLabel,
} from "@/lib/format";
import { getTutorDetail } from "@/lib/tutors";
import { StartThreadButton } from "./start-thread-button";

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  let tutor: Awaited<ReturnType<typeof getTutorDetail>> | null = null;
  try {
    tutor = await getTutorDetail(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const rate = formatCurrencyCents(tutor.tutorProfile.hourlyRateCents);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <Link
          href="/tutors"
          className="text-xs text-slate-400 transition hover:text-white"
        >
          ← Back to tutors
        </Link>

        <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-start">
          <Avatar
            name={tutor.profile.fullName}
            src={tutor.profile.avatarUrl}
            size="xl"
            className="rounded-2xl"
          />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{tutor.profile.fullName}</h1>
              {tutor.verificationStatus === "VERIFIED" ? (
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                  Verified
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                  {formatStatusLabel(tutor.verificationStatus ?? "UNVERIFIED")}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300">
              {tutor.profile.major ?? "NYU student"}
              {tutor.profile.graduationYear
                ? ` · class of ${tutor.profile.graduationYear}`
                : ""}
            </p>
            {tutor.tutorProfile.headline ? (
              <p className="text-base text-slate-200">{tutor.tutorProfile.headline}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 font-semibold text-white">
                {rate ? `${rate}/hr` : "Open rate"}
              </span>
              <span>{formatRating(tutor.stats.averageRating)}</span>
              <span>
                {tutor.stats.reviewCount} review{tutor.stats.reviewCount === 1 ? "" : "s"}
              </span>
              {tutor.tutorProfile.supportsOnline ? <span>· Online</span> : null}
              {tutor.tutorProfile.supportsInPerson ? (
                <span>
                  · In person{tutor.tutorProfile.defaultLocation ? ` (${tutor.tutorProfile.defaultLocation})` : ""}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:w-56">
            <StartThreadButton tutorId={tutor.id} viewerId={session?.user?.id ?? null} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            {tutor.profile.bio ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">About</h2>
                <p className="mt-3 text-sm leading-7 text-slate-200">{tutor.profile.bio}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Subjects</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {tutor.tutorProfile.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                  >
                    <p className="text-sm font-semibold text-white">
                      {subject.department} {subject.code}
                    </p>
                    <p className="text-xs text-slate-400">{subject.name}</p>
                    {subject.proficiencyNote ? (
                      <p className="mt-1 text-xs text-cyan-200/90">{subject.proficiencyNote}</p>
                    ) : null}
                    {subject.isPrimary ? (
                      <span className="mt-2 inline-block rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                        Primary
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Recent reviews</h2>
              <div className="mt-4 space-y-3">
                {tutor.recentReviews.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                    No reviews yet. Be the first to leave one after your session.
                  </p>
                ) : (
                  tutor.recentReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">
                          {review.author.fullName}
                        </span>
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-white">{review.rating}★</p>
                      {review.comment ? (
                        <p className="mt-2 text-sm text-slate-200">{review.comment}</p>
                      ) : null}
                      {review.subject ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {review.subject.department} {review.subject.code}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Availability
              </h3>
              <p className="mt-2 text-sm text-white">
                {tutor.tutorProfile.availabilityNotes ??
                  "Ask the tutor — availability not listed."}
              </p>
              {tutor.tutorProfile.defaultLocation ? (
                <>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Default location
                  </h3>
                  <p className="mt-2 text-sm text-white">
                    {tutor.tutorProfile.defaultLocation}
                  </p>
                </>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                How to book
              </h3>
              <ol className="mt-3 space-y-2 pl-4 leading-6">
                <li>1. Start a message thread to introduce yourself.</li>
                <li>2. Agree on a time, topic, and mode.</li>
                <li>3. Create a session and confirm.</li>
                <li>4. Leave a review after it's completed.</li>
              </ol>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

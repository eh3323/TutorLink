import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { auth } from "@/lib/auth";
import {
  formatCurrencyCents,
  formatDate,
  formatRating,
  formatStatusLabel,
} from "@/lib/format";
import { getPublicUser } from "@/lib/users";
import { StartThreadButton } from "@/app/tutors/[id]/start-thread-button";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  let user: Awaited<ReturnType<typeof getPublicUser>> | null = null;
  try {
    user = await getPublicUser(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const isSelf = session?.user?.id === user.id;
  const tutorBlock = user.tutorProfile;
  const tuteeBlock = user.tuteeProfile;
  const rate = tutorBlock ? formatCurrencyCents(tutorBlock.hourlyRateCents) : null;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/messages"
            className="text-slate-400 transition hover:text-white"
          >
            ← Back
          </Link>
          {isSelf ? (
            <Link
              href="/profile"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10"
            >
              Edit my profile
            </Link>
          ) : null}
        </div>

        <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-start">
          <Avatar
            name={user.profile.fullName}
            src={user.profile.avatarUrl}
            size="xl"
            className="rounded-2xl"
          />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">
                {user.profile.fullName}
              </h1>
              <RoleBadge role={user.role} isAdmin={user.isAdmin} />
              {tutorBlock?.verificationStatus === "VERIFIED" ? (
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                  Verified tutor
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-300">
              {user.profile.major ?? "NYU student"}
              {user.profile.graduationYear
                ? ` · class of ${user.profile.graduationYear}`
                : ""}
            </p>
            {user.profile.bio ? (
              <p className="text-base text-slate-200">{user.profile.bio}</p>
            ) : null}
          </div>

          {!isSelf && tutorBlock ? (
            <div className="flex flex-col gap-3 sm:w-56">
              <StartThreadButton tutorId={user.id} viewerId={session?.user?.id ?? null} />
            </div>
          ) : null}
        </section>

        {tutorBlock ? (
          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">As a tutor</h2>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-white">
                    {rate ? `${rate}/hr` : "Open rate"}
                  </span>
                </div>
                {tutorBlock.headline ? (
                  <p className="mt-3 text-sm text-slate-200">{tutorBlock.headline}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span>{formatRating(user.stats.averageRating)}</span>
                  <span>
                    {user.stats.reviewCount} review
                    {user.stats.reviewCount === 1 ? "" : "s"}
                  </span>
                  {tutorBlock.supportsOnline ? <span>· Online</span> : null}
                  {tutorBlock.supportsInPerson ? (
                    <span>
                      · In person
                      {tutorBlock.defaultLocation ? ` (${tutorBlock.defaultLocation})` : ""}
                    </span>
                  ) : null}
                  {tutorBlock.verificationStatus !== "VERIFIED" ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                      {formatStatusLabel(tutorBlock.verificationStatus)}
                    </span>
                  ) : null}
                </div>
              </div>

              {tutorBlock.subjects.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold text-white">Subjects</h2>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {tutorBlock.subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <p className="text-sm font-semibold text-white">
                          {subject.department} {subject.code}
                        </p>
                        <p className="text-xs text-slate-400">{subject.name}</p>
                        {subject.proficiencyNote ? (
                          <p className="mt-1 text-xs text-cyan-200/90">
                            {subject.proficiencyNote}
                          </p>
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
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Recent reviews</h2>
                <div className="mt-4 space-y-3">
                  {user.recentReviews.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                      No reviews yet.
                    </p>
                  ) : (
                    user.recentReviews.map((review) => (
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
                  {tutorBlock.availabilityNotes ?? "Ask the tutor — availability not listed."}
                </p>
                {tutorBlock.defaultLocation ? (
                  <>
                    <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Default location
                    </h3>
                    <p className="mt-2 text-sm text-white">{tutorBlock.defaultLocation}</p>
                  </>
                ) : null}
              </div>
            </aside>
          </section>
        ) : null}

        {tuteeBlock ? (
          <section className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-6">
            <h2 className="text-lg font-semibold text-white">As a tutee</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Block label="Learning goals" value={tuteeBlock.learningGoals} />
              <Block
                label="Preferred budget"
                value={
                  tuteeBlock.preferredBudgetCents != null
                    ? `${formatCurrencyCents(tuteeBlock.preferredBudgetCents)}/hr`
                    : null
                }
              />
              <Block
                label="Mode preferences"
                value={[
                  tuteeBlock.supportsOnline ? "Online" : null,
                  tuteeBlock.supportsInPerson ? "In person" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || null}
              />
              <Block label="Availability" value={tuteeBlock.availabilityNotes} />
            </div>
          </section>
        ) : null}

        {!tutorBlock && !tuteeBlock ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
            This user hasn't filled out their profile yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-white">
        {value && value.trim() ? value : "Not specified"}
      </p>
    </div>
  );
}

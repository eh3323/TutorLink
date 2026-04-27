import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { formatCurrencyCents, formatRating } from "@/lib/format";
import { listTutors, parseTutorSearchParams } from "@/lib/tutors";

type SearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(params: SearchParams) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim().length > 0) {
      urlParams.set(key, value);
    }
  }
  return urlParams;
}

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const urlParams = toURLSearchParams(raw);

  let tutors: Awaited<ReturnType<typeof listTutors>>["tutors"] = [];
  let error: string | null = null;

  try {
    const parsed = parseTutorSearchParams(urlParams);
    tutors = (await listTutors(parsed)).tutors;
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load tutors.";
  }

  const filters = {
    subject: (raw.subject as string | undefined) ?? "",
    mode: (raw.mode as string | undefined) ?? "",
    minRate: (raw.minRate as string | undefined) ?? "",
    maxRate: (raw.maxRate as string | undefined) ?? "",
    verified: (raw.verified as string | undefined) ?? "",
  };

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            Marketplace
          </p>
          <h1 className="text-3xl font-semibold text-white">Browse NYU peer tutors</h1>
          <p className="text-sm text-slate-400">
            Filter by subject, delivery mode, budget, and verification.
          </p>
        </section>

        <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-5">
          <input
            name="subject"
            defaultValue={filters.subject}
            placeholder="Subject (e.g. CSCI, calc)"
            className={inputClass}
          />
          <select name="mode" defaultValue={filters.mode} className={inputClass}>
            <option value="">Any mode</option>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
          </select>
          <input
            name="minRate"
            type="number"
            min={0}
            defaultValue={filters.minRate}
            placeholder="Min rate (cents)"
            className={inputClass}
          />
          <input
            name="maxRate"
            type="number"
            min={0}
            defaultValue={filters.maxRate}
            placeholder="Max rate (cents)"
            className={inputClass}
          />
          <div className="flex gap-2">
            <select
              name="verified"
              defaultValue={filters.verified}
              className={`${inputClass} flex-1`}
            >
              <option value="">All tutors</option>
              <option value="true">Verified only</option>
              <option value="false">Unverified</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Apply
            </button>
          </div>
        </form>

        {error ? (
          <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        {tutors.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <p className="text-base font-medium text-white">No tutors match that filter.</p>
            <p className="mt-2 text-sm text-slate-400">
              Try widening the rate range, changing the subject, or clearing filters.
            </p>
            <Link
              href="/tutors"
              className="mt-4 inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Clear filters
            </Link>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutors.map((tutor) => (
            <Link
              key={tutor.id}
              href={`/tutors/${tutor.id}`}
              className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/40 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={tutor.profile.fullName}
                  src={tutor.profile.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {tutor.profile.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {tutor.profile.major ?? "NYU student"}
                    {tutor.profile.graduationYear
                      ? ` · class of ${tutor.profile.graduationYear}`
                      : ""}
                  </p>
                </div>
                {tutor.tutorProfile.verificationStatus === "VERIFIED" ? (
                  <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    Verified
                  </span>
                ) : null}
              </div>

              {tutor.tutorProfile.headline ? (
                <p className="text-sm leading-6 text-slate-200">
                  {tutor.tutorProfile.headline}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {tutor.tutorProfile.subjects.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-200"
                  >
                    {s.department} {s.code}
                  </span>
                ))}
                {tutor.tutorProfile.subjects.length > 4 ? (
                  <span className="text-[10px] text-slate-500">
                    +{tutor.tutorProfile.subjects.length - 4} more
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <span>{formatRating(tutor.stats.averageRating)}</span>
                  <span>·</span>
                  <span>{tutor.stats.reviewCount} review{tutor.stats.reviewCount === 1 ? "" : "s"}</span>
                </div>
                <span className="font-semibold text-white">
                  {tutor.tutorProfile.hourlyRateCents != null
                    ? `${formatCurrencyCents(tutor.tutorProfile.hourlyRateCents)}/hr`
                    : "Open rate"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300";

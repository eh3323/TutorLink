import Link from "next/link";

import { auth } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import {
  formatDate,
  formatMode,
  formatRateRange,
  formatStatusLabel,
} from "@/lib/format";
import { listRequests, parseRequestSearchParams } from "@/lib/requests";

type SearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(params: SearchParams) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out.set(key, value);
    }
  }
  return out;
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const raw = await searchParams;
  const urlParams = toURLSearchParams(raw);

  let requests: Awaited<ReturnType<typeof listRequests>>["requests"] = [];
  let error: string | null = null;

  try {
    const parsed = parseRequestSearchParams(urlParams);
    requests = (await listRequests(parsed)).requests;
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load requests.";
  }

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Request board
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white">
              Open tutoring requests
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Tutees post what they want help with. Tutors browse, message, and
              propose a session.
            </p>
          </div>
          <Link
            href={session?.user ? "/requests/new" : "/signin"}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Post a request
          </Link>
        </section>

        <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
          <input
            name="subject"
            defaultValue={(raw.subject as string | undefined) ?? ""}
            placeholder="Subject (e.g. MATH, calc)"
            className={inputClass}
          />
          <select
            name="mode"
            defaultValue={(raw.mode as string | undefined) ?? ""}
            className={inputClass}
          >
            <option value="">Any mode</option>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
          </select>
          <select
            name="status"
            defaultValue={(raw.status as string | undefined) ?? ""}
            className={inputClass}
          >
            <option value="">Open only</option>
            <option value="OPEN">Open</option>
            <option value="MATCHED">Matched</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Apply
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <p className="text-base font-medium text-white">No requests yet.</p>
            <p className="mt-2 text-sm text-slate-400">
              Be the first to post what you're studying this week.
            </p>
            <Link
              href={session?.user ? "/requests/new" : "/signin"}
              className="mt-4 inline-flex items-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Post a request
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                      {request.subject.department} {request.subject.code}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {request.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                    {formatStatusLabel(request.status)}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-300">
                  {request.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    {formatMode(request.preferredMode)}
                  </span>
                  {formatRateRange(request.budgetMinCents, request.budgetMaxCents) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      Budget {formatRateRange(request.budgetMinCents, request.budgetMaxCents)}
                    </span>
                  ) : null}
                  {request.locationText ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      {request.locationText}
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={request.tutee.fullName}
                      src={request.tutee.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {request.tutee.fullName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Posted {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/requests/${request.id}`}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    View →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300";

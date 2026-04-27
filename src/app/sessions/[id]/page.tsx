import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import {
  formatCurrencyCents,
  formatDateTime,
  formatMode,
  formatStatusLabel,
} from "@/lib/format";
import {
  getSessionDetailForUser,
  listSessionAttachments,
} from "@/lib/sessions";
import { SessionAttachments } from "./session-attachments";
import { SessionControls } from "./session-controls";
import { ReviewForm } from "./review-form";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getSessionDetailForUser>> | null = null;
  try {
    detail = await getSessionDetailForUser(session.user, id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const canReview =
    detail.status === "COMPLETED" &&
    !detail.reviews.some((r) => r.authorIsMe);

  // attachments only make sense for online sessions; skip the db hit otherwise
  const isOnline = detail.mode === "ONLINE";
  const attachments = isOnline
    ? await listSessionAttachments(session.user, detail.id)
    : [];
  const canUpload = isOnline && detail.status !== "CANCELLED";

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <Link href="/sessions" className="text-xs text-slate-400 hover:text-white">
          ← All sessions
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                {detail.subject.department} {detail.subject.code} · {detail.subject.name}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                Session with {detail.counterpart.fullName}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {formatDateTime(detail.scheduledAt)} · {detail.durationMinutes} min ·{" "}
                {formatMode(detail.mode)}
                {detail.locationText ? ` · ${detail.locationText}` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                detail.status === "CONFIRMED"
                  ? "bg-emerald-400/15 text-emerald-200"
                  : detail.status === "COMPLETED"
                    ? "bg-cyan-400/15 text-cyan-200"
                    : detail.status === "CANCELLED"
                      ? "bg-rose-400/15 text-rose-200"
                      : "bg-amber-400/15 text-amber-200"
              }`}
            >
              {formatStatusLabel(detail.status)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Info
              label="Tutor"
              value={detail.participants.tutor.fullName}
              subtext={detail.participants.tutor.email}
              isMe={detail.viewerRole === "TUTOR"}
            />
            <Info
              label="Tutee"
              value={detail.participants.tutee.fullName}
              subtext={detail.participants.tutee.email}
              isMe={detail.viewerRole === "TUTEE"}
            />
            <Info
              label="Agreed rate"
              value={
                detail.agreedRateCents != null
                  ? `${formatCurrencyCents(detail.agreedRateCents)}/hr`
                  : "Not set"
              }
            />
          </div>

          {detail.notes ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-2 whitespace-pre-wrap">{detail.notes}</p>
            </div>
          ) : null}
        </section>

        <SessionControls
          sessionId={detail.id}
          status={detail.status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"}
          viewerIsProposer={detail.viewerIsProposer}
          scheduledAtIso={
            detail.scheduledAt instanceof Date
              ? detail.scheduledAt.toISOString()
              : new Date(detail.scheduledAt as unknown as string).toISOString()
          }
          durationMinutes={detail.durationMinutes}
          threadId={detail.thread?.id ?? null}
        />

        {detail.status === "CANCELLED" && detail.cancellationReason ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-200">
              Cancellation note
            </p>
            <p className="mt-2 whitespace-pre-wrap">{detail.cancellationReason}</p>
          </section>
        ) : null}

        {isOnline ? (
          <SessionAttachments
            sessionId={detail.id}
            initial={attachments.map((a) => ({
              ...a,
              createdAt:
                a.createdAt instanceof Date
                  ? a.createdAt.toISOString()
                  : a.createdAt,
            }))}
            canUpload={canUpload}
          />
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Reviews</h2>
          {detail.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              {detail.status === "COMPLETED"
                ? "No reviews yet. Share what the session was like!"
                : "Reviews unlock once the session is marked complete."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {detail.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={review.author.fullName}
                      src={review.author.avatarUrl ?? null}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {review.authorIsMe ? "You" : review.author.fullName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {review.rating}★ · {formatDateTime(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  {review.comment ? (
                    <p className="mt-3 text-sm text-slate-200">{review.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {canReview ? (
            <div className="mt-6">
              <ReviewForm sessionId={detail.id} />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
  subtext,
  isMe,
}: {
  label: string;
  value: string;
  subtext?: string;
  isMe?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">
        {value} {isMe ? <span className="text-cyan-300">(you)</span> : null}
      </p>
      {subtext ? <p className="mt-1 text-[11px] text-slate-500">{subtext}</p> : null}
    </div>
  );
}

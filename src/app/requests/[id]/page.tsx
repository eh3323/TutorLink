import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { auth } from "@/lib/auth";
import {
  formatDate,
  formatMode,
  formatRateRange,
  formatStatusLabel,
} from "@/lib/format";
import { canActAsTutor } from "@/lib/permissions";
import { getRequestDetail } from "@/lib/requests";
import { RequestReplyButton } from "./request-reply-button";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let request: Awaited<ReturnType<typeof getRequestDetail>> | null = null;
  try {
    request = await getRequestDetail(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const session = await auth();
  const isTutee = session?.user?.id === request.tutee.id;
  const canReply = session?.user && !isTutee && canActAsTutor(session.user.role);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <Link href="/requests" className="text-xs text-slate-400 hover:text-white">
          ← Back to requests
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                {request.subject.department} {request.subject.code} · {request.subject.name}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{request.title}</h1>
            </div>
            <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              {formatStatusLabel(request.status)}
            </span>
          </div>

          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {request.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Mode: {formatMode(request.preferredMode)}
            </span>
            {formatRateRange(request.budgetMinCents, request.budgetMaxCents) ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Budget: {formatRateRange(request.budgetMinCents, request.budgetMaxCents)}
              </span>
            ) : null}
            {request.locationText ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Location: {request.locationText}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Posted {formatDate(request.createdAt)}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <Avatar
              name={request.tutee.fullName}
              src={request.tutee.avatarUrl}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-white">{request.tutee.fullName}</p>
              <p className="text-xs text-slate-400">
                {request.tutee.major ?? "NYU student"}
                {request.tutee.graduationYear
                  ? ` · class of ${request.tutee.graduationYear}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="mt-5">
            {isTutee ? (
              <p className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                This is your own request. Tutors will reach out directly.
              </p>
            ) : canReply ? (
              <RequestReplyButton
                tutorId={session!.user!.id}
                tuteeId={request.tutee.id}
                requestId={request.id}
              />
            ) : (
              <p className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                {session?.user
                  ? "Switch to a tutor profile to reach out to tutees."
                  : "Sign in with an NYU email to message this tutee."}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

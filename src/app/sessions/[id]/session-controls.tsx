"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Status = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

type Props = {
  sessionId: string;
  status: Status;
  viewerIsProposer: boolean;
  scheduledAtIso: string;
  durationMinutes: number;
  threadId: string | null;
};

function getRoomWindow(scheduledAtIso: string, durationMinutes: number) {
  const start = new Date(scheduledAtIso).getTime() - 15 * 60_000;
  const end = new Date(scheduledAtIso).getTime() + durationMinutes * 60_000 + 30 * 60_000;
  return { start, end };
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `in ${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return `in ${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return `in ${d}d ${hh}h`;
}

export function SessionControls({
  sessionId,
  status,
  viewerIsProposer,
  scheduledAtIso,
  durationMinutes,
  threadId,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function call(action: string, body?: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      const url = action === "complete"
        ? `/api/sessions/${sessionId}`
        : `/api/sessions/${sessionId}/${action}`;
      const init: RequestInit =
        action === "complete"
          ? {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "COMPLETED" }),
            }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body ?? {}),
            };
      const res = await fetch(url, init);
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not update session.");
      } else {
        setReason("");
        router.refresh();
      }
    } catch {
      setError("network error. try again.");
    } finally {
      setBusy(null);
    }
  }

  if (status === "CANCELLED" || status === "COMPLETED") {
    return null;
  }

  const window = getRoomWindow(scheduledAtIso, durationMinutes);
  const isLive = now >= window.start && now <= window.end;
  const startsAt = new Date(scheduledAtIso).getTime();
  const beforeOpen = window.start - now;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Actions
      </h2>

      {status === "PENDING" ? (
        <>
          <p className="text-sm text-slate-300">
            {viewerIsProposer
              ? "Waiting on the other side to accept your proposal."
              : "The other side proposed this session. Accept to lock it in or decline to skip."}
          </p>
          <div className="flex flex-wrap gap-2">
            {!viewerIsProposer ? (
              <button
                type="button"
                onClick={() => call("accept")}
                disabled={busy !== null}
                className="inline-flex h-10 items-center rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:opacity-60"
              >
                {busy === "accept" ? "Accepting…" : "Accept"}
              </button>
            ) : null}
            {!viewerIsProposer ? (
              <button
                type="button"
                onClick={() => call("decline", { reason: reason.trim() || undefined })}
                disabled={busy !== null}
                className="inline-flex h-10 items-center rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
              >
                {busy === "decline" ? "Declining…" : "Decline"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => call("cancel", { reason: reason.trim() || undefined })}
              disabled={busy !== null}
              className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
            >
              {busy === "cancel" ? "Cancelling…" : viewerIsProposer ? "Cancel proposal" : "Cancel"}
            </button>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Optional note: tell them why you're declining or cancelling."
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:border-cyan-300"
          />
        </>
      ) : null}

      {status === "CONFIRMED" ? (
        <>
          <p className="text-sm text-slate-300">
            Locked in for {new Date(scheduledAtIso).toLocaleString()}{" "}
            {beforeOpen > 0 ? <span className="text-slate-400">· room opens {fmtCountdown(beforeOpen)}</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/sessions/${sessionId}/calendar.ics`}
              className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
            >
              Add to calendar (.ics)
            </a>
            {isLive ? (
              <a
                href={`/sessions/${sessionId}/room`}
                className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Enter session room
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 cursor-not-allowed items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-400"
              >
                Room opens 15m before · {fmtCountdown(window.start - now)}
              </button>
            )}
            {threadId ? (
              <a
                href={`/messages/${threadId}`}
                className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Open thread
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => call("complete")}
              disabled={busy !== null || now < startsAt}
              className="inline-flex h-10 items-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-50"
              title={now < startsAt ? "you can mark complete after the session has started" : undefined}
            >
              {busy === "complete" ? "Marking…" : "Mark complete"}
            </button>
            <button
              type="button"
              onClick={() => call("cancel", { reason: reason.trim() || undefined })}
              disabled={busy !== null}
              className="inline-flex h-10 items-center rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 text-sm font-medium text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel session"}
            </button>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Optional reason if you cancel."
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:border-cyan-300"
          />
        </>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

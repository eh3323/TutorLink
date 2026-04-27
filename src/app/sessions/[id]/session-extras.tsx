"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDateTime } from "@/lib/format";

type Props = {
  sessionId: string;
  status: string;
  livekitEnabled: boolean;
  recordingStorageEnabled: boolean;
  aiSummaryEnabled: boolean;
  viewerRole: "TUTOR" | "TUTEE";
  recording: {
    tutorConsentedAt: string | Date | null;
    tuteeConsentedAt: string | Date | null;
    startedAt: string | Date | null;
    endedAt: string | Date | null;
    url: string | null;
  };
  summary: {
    text: string | null;
    generatedAt: string | Date | null;
  };
};

export function SessionExtras({
  sessionId,
  status,
  livekitEnabled,
  recordingStorageEnabled,
  aiSummaryEnabled,
  viewerRole,
  recording,
  summary,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myConsentAt =
    viewerRole === "TUTOR" ? recording.tutorConsentedAt : recording.tuteeConsentedAt;
  const otherConsentAt =
    viewerRole === "TUTOR" ? recording.tuteeConsentedAt : recording.tutorConsentedAt;
  const bothConsented = Boolean(recording.tutorConsentedAt && recording.tuteeConsentedAt);
  const isRecording = Boolean(recording.startedAt && !recording.endedAt);

  async function call(path: string, init: RequestInit, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, init);
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Action failed.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const consentToggle = () => {
    if (myConsentAt) {
      void call(
        `/api/sessions/${sessionId}/recording/consent`,
        { method: "DELETE" },
        "consent",
      );
    } else {
      void call(
        `/api/sessions/${sessionId}/recording/consent`,
        { method: "POST" },
        "consent",
      );
    }
  };

  const startRecord = () =>
    call(
      `/api/sessions/${sessionId}/recording/start`,
      { method: "POST" },
      "start",
    );
  const stopRecord = () =>
    call(
      `/api/sessions/${sessionId}/recording/stop`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      "stop",
    );
  const genSummary = () =>
    call(`/api/sessions/${sessionId}/summary`, { method: "POST" }, "summary");

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Recording &amp; AI summary</h2>
          <p className="mt-1 text-xs text-slate-400">
            Recordings require both sides to opt in first. AI summaries pull from the
            chat transcript so questions and follow-ups don&rsquo;t get lost between sessions.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Consent
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>
              You:{" "}
              {myConsentAt ? (
                <span className="text-emerald-300">
                  agreed · {formatDateTime(myConsentAt)}
                </span>
              ) : (
                <span className="text-slate-400">not yet</span>
              )}
            </li>
            <li>
              Other side:{" "}
              {otherConsentAt ? (
                <span className="text-emerald-300">
                  agreed · {formatDateTime(otherConsentAt)}
                </span>
              ) : (
                <span className="text-slate-400">waiting</span>
              )}
            </li>
          </ul>
          <button
            type="button"
            onClick={consentToggle}
            disabled={busy === "consent" || status === "CANCELLED"}
            className="mt-3 inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-60"
          >
            {myConsentAt ? "Withdraw consent" : "I consent to recording"}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recording
          </p>
          {!livekitEnabled ? (
            <p className="mt-2 text-sm text-slate-400">
              Recording requires LiveKit env vars. Set them in production to enable.
            </p>
          ) : !recordingStorageEnabled ? (
            <p className="mt-2 text-sm text-slate-400">
              Set <code className="rounded bg-white/10 px-1">LIVEKIT_S3_*</code> env
              vars (bucket / region / access key / secret) to enable recording uploads.
            </p>
          ) : isRecording ? (
            <p className="mt-2 text-sm text-emerald-200">
              Recording in progress — started {formatDateTime(recording.startedAt!)}.
            </p>
          ) : recording.url ? (
            <p className="mt-2 text-sm text-slate-200">
              Saved to <a href={recording.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">recording link</a>.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No active recording.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {livekitEnabled && recordingStorageEnabled ? (
              isRecording ? (
                <button
                  type="button"
                  onClick={stopRecord}
                  disabled={busy === "stop"}
                  className="inline-flex h-9 items-center rounded-md bg-rose-500 px-3 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-60"
                >
                  Stop recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecord}
                  disabled={!bothConsented || busy === "start" || status !== "CONFIRMED"}
                  className="inline-flex h-9 items-center rounded-md bg-cyan-300 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
                  title={
                    !bothConsented
                      ? "Both sides must consent first"
                      : status !== "CONFIRMED"
                        ? "Only confirmed sessions can be recorded"
                        : undefined
                  }
                >
                  Start recording
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              AI session summary
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {aiSummaryEnabled
                ? "Reads the chat thread and writes a tight recap with practice items and open questions."
                : "Set OPENAI_API_KEY on the server to enable AI summaries."}
            </p>
          </div>
          {aiSummaryEnabled ? (
            <button
              type="button"
              onClick={genSummary}
              disabled={busy === "summary" || status === "CANCELLED"}
              className="inline-flex h-9 shrink-0 items-center rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
            >
              {summary.text ? "Regenerate" : "Generate summary"}
            </button>
          ) : null}
        </div>
        {summary.text ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
            {summary.generatedAt ? (
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Generated {formatDateTime(summary.generatedAt)}
              </p>
            ) : null}
            <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/80 p-3 text-[13px] leading-6 text-slate-200">
              {summary.text}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

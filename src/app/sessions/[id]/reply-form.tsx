"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not post reply.");
      } else {
        setReply("");
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-lg border border-white/10 bg-slate-950/40 p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Reply once — keep it civil and helpful
      </p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Thanks for the feedback…"
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
      />
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !reply.trim()}
        className="inline-flex h-8 items-center rounded-md bg-cyan-300 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {busy ? "Posting…" : "Post reply"}
      </button>
    </form>
  );
}

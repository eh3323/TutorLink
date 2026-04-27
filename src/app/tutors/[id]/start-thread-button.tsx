"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function StartThreadButton({
  tutorId,
  viewerId,
}: {
  tutorId: string;
  viewerId: string | null;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!viewerId) {
    return (
      <Link
        href="/signin"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
      >
        Sign in to message
      </Link>
    );
  }

  if (viewerId === tutorId) {
    return (
      <p className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-center text-xs text-slate-400">
        This is your tutor profile.
      </p>
    );
  }

  async function startThread() {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, tuteeId: viewerId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not start conversation.");
        setIsLoading(false);
        return;
      }
      router.push(`/messages/${payload.data.thread.id}`);
    } catch {
      setError("Network error. Try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startThread}
        disabled={isLoading}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Opening…" : "Message this tutor"}
      </button>
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

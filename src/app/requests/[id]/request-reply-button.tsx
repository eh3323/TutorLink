"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestReplyButton({
  tutorId,
  tuteeId,
  requestId,
}: {
  tutorId: string;
  tuteeId: string;
  requestId: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reply() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, tuteeId, requestId }),
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
        onClick={reply}
        disabled={isLoading}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Starting thread…" : "Offer to help"}
      </button>
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const ALLOWED: Record<Status, Array<{ value: Status; label: string; tone: string }>> = {
  PENDING: [
    { value: "CONFIRMED", label: "Confirm session", tone: "bg-emerald-400 text-slate-950" },
    { value: "CANCELLED", label: "Cancel session", tone: "bg-rose-400/80 text-slate-950" },
  ],
  CONFIRMED: [
    { value: "COMPLETED", label: "Mark as completed", tone: "bg-cyan-300 text-slate-950" },
    { value: "CANCELLED", label: "Cancel session", tone: "bg-rose-400/80 text-slate-950" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function SessionControls({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = ALLOWED[status as Status] ?? [];
  if (actions.length === 0) return null;

  async function update(next: Status) {
    setIsLoading(next);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not update session.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => update(action.value)}
            disabled={isLoading !== null}
            className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60 ${action.tone}`}
          >
            {isLoading === action.value ? "Updating…" : action.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

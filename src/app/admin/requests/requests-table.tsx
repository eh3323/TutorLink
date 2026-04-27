"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatDate, formatStatusLabel } from "@/lib/format";

type AdminRequest = {
  id: string;
  title: string;
  description: string;
  status: string;
  preferredMode: string;
  createdAt: string | Date;
  subject: { department: string; code: string; name: string };
  tutee: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

const STATUSES = ["OPEN", "MATCHED", "CLOSED", "CANCELLED"] as const;

export function RequestsTable({ requests }: { requests: AdminRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not update request.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
        No requests yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
      {requests.map((r) => (
        <article
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-start"
        >
          <Avatar name={r.tutee.fullName} src={r.tutee.avatarUrl} size="md" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/requests/${r.id}`}
                className="text-sm font-semibold text-white hover:text-cyan-200"
              >
                {r.title}
              </Link>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                {formatStatusLabel(r.status)}
              </span>
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-200">
                {r.subject.department} {r.subject.code}
              </span>
            </div>
            <p className="line-clamp-2 text-xs text-slate-400">{r.description}</p>
            <p className="text-[11px] text-slate-500">
              Posted by {r.tutee.fullName} ({r.tutee.email}) · {formatDate(r.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update(r.id, s)}
                disabled={busyId === r.id || r.status === s}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  r.status === s
                    ? "bg-cyan-300 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatCurrencyCents } from "@/lib/format";

type AdminTutor = {
  id: string;
  userId: string;
  headline: string | null;
  hourlyRateCents: number | null;
  verificationStatus: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    major: string | null;
  };
  subjects: Array<{ department: string; code: string; name: string }>;
};

export function TutorVerificationTable({ tutors }: { tutors: AdminTutor[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, verificationStatus: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tutors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not update tutor.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (tutors.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
        No tutors match that status.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {tutors.map((t) => (
          <div
            key={t.id}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={t.user.fullName} src={t.user.avatarUrl} size="md" />
              <div className="min-w-0">
                <Link
                  href={`/tutors/${t.userId}`}
                  className="truncate text-sm font-semibold text-white hover:text-cyan-200"
                >
                  {t.user.fullName}
                </Link>
                <p className="truncate text-xs text-slate-400">
                  {t.user.email}
                  {t.user.major ? ` · ${t.user.major}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {t.headline ?? <span className="text-slate-500">No headline</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.subjects.slice(0, 4).map((s) => (
                    <span
                      key={`${s.department}${s.code}`}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                    >
                      {s.department} {s.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 sm:w-32">
              <span>
                {t.hourlyRateCents != null
                  ? `${formatCurrencyCents(t.hourlyRateCents)}/hr`
                  : "Open rate"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  t.verificationStatus === "VERIFIED"
                    ? "bg-emerald-400/15 text-emerald-200"
                    : t.verificationStatus === "PENDING"
                      ? "bg-amber-400/15 text-amber-200"
                      : "bg-slate-400/10 text-slate-300"
                }`}
              >
                {t.verificationStatus}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => update(t.id, "VERIFIED")}
                disabled={busyId === t.id}
                className="rounded-md bg-emerald-400/80 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-40"
              >
                Verify
              </button>
              <button
                type="button"
                onClick={() => update(t.id, "PENDING")}
                disabled={busyId === t.id}
                className="rounded-md bg-amber-400/80 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-40"
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => update(t.id, "UNVERIFIED")}
                disabled={busyId === t.id}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

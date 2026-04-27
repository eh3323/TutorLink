"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { formatCurrencyCents } from "@/lib/format";

type AdminUserVerification = {
  id: string;
  email: string;
  role: string | null;
  isAdmin: boolean;
  verificationStatus: string;
  verificationNote: string | null;
  verificationSubmittedAt: Date | string | null;
  verificationDocument: {
    name: string;
    mimeType: string;
    sizeBytes: number | null;
  } | null;
  fullName: string;
  avatarUrl: string | null;
  major: string | null;
  graduationYear: number | null;
  bio: string | null;
  tutor: {
    headline: string | null;
    hourlyRateCents: number | null;
    subjects: Array<{ department: string; code: string; name: string }>;
  } | null;
  tutee: {
    learningGoals: string | null;
    preferredBudgetCents: number | null;
  } | null;
};

function formatSubmittedAt(value: Date | string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  } catch {
    return null;
  }
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VerificationTable({
  users,
}: {
  users: AdminUserVerification[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(userId: string, verificationStatus: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tutors/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not update user.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
        No accounts match that filter.
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
        {users.map((u) => {
          const submitted = formatSubmittedAt(u.verificationSubmittedAt);
          return (
            <div
              key={u.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-start"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar name={u.fullName} src={u.avatarUrl} size="md" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/users/${u.id}`}
                      className="truncate text-sm font-semibold text-white hover:text-amber-200"
                    >
                      {u.fullName}
                    </Link>
                    <RoleBadge
                      role={u.role}
                      isAdmin={u.isAdmin}
                      size="xs"
                    />
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {u.email}
                    {u.major ? ` · ${u.major}` : ""}
                    {u.graduationYear ? ` · ${u.graduationYear}` : ""}
                  </p>
                  {u.tutor?.headline ? (
                    <p className="text-xs text-slate-300">
                      Tutor · {u.tutor.headline}
                      {u.tutor.hourlyRateCents != null
                        ? ` · ${formatCurrencyCents(u.tutor.hourlyRateCents)}/hr`
                        : ""}
                    </p>
                  ) : null}
                  {u.tutee?.learningGoals ? (
                    <p className="text-xs text-slate-300">
                      Tutee · {u.tutee.learningGoals.slice(0, 80)}
                      {u.tutee.learningGoals.length > 80 ? "…" : ""}
                    </p>
                  ) : null}
                  {u.tutor && u.tutor.subjects.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.tutor.subjects.slice(0, 4).map((s) => (
                        <span
                          key={`${s.department}${s.code}`}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                        >
                          {s.department} {s.code}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {u.verificationNote ? (
                    <p className="mt-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs italic text-slate-200">
                      “{u.verificationNote}”
                    </p>
                  ) : null}
                  {u.verificationDocument ? (
                    <a
                      href={`/api/admin/verifications/${u.id}/document`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/20"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M10 12a1 1 0 0 1-.7-.3l-3-3a1 1 0 0 1 1.4-1.4L9 8.59V3a1 1 0 0 1 2 0v5.59l1.3-1.3a1 1 0 1 1 1.4 1.42l-3 3a1 1 0 0 1-.7.29Z" />
                        <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                      </svg>
                      Download {u.verificationDocument.name}
                      <span className="text-[10px] font-medium text-amber-200/80">
                        {u.verificationDocument.mimeType}
                        {u.verificationDocument.sizeBytes
                          ? ` · ${formatBytes(u.verificationDocument.sizeBytes)}`
                          : ""}
                      </span>
                    </a>
                  ) : (
                    <p className="mt-2 text-[10px] italic text-slate-500">
                      No document uploaded yet.
                    </p>
                  )}
                  {submitted ? (
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                      Submitted {submitted}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 lg:items-end">
                <span
                  className={`self-start rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide lg:self-end ${
                    u.verificationStatus === "VERIFIED"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : u.verificationStatus === "PENDING"
                        ? "bg-amber-400/15 text-amber-200"
                        : "bg-slate-400/10 text-slate-300"
                  }`}
                >
                  {u.verificationStatus}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => update(u.id, "VERIFIED")}
                    disabled={busyId === u.id || u.verificationStatus === "VERIFIED"}
                    className="rounded-md bg-emerald-400/80 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => update(u.id, "UNVERIFIED")}
                    disabled={busyId === u.id || u.verificationStatus === "UNVERIFIED"}
                    className="rounded-md bg-rose-400/80 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-rose-300 disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => update(u.id, "PENDING")}
                    disabled={busyId === u.id || u.verificationStatus === "PENDING"}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    Mark pending
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

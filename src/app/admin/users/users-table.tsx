"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatDate } from "@/lib/format";

type AdminUser = {
  id: string;
  email: string;
  role: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string | Date;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    major: string | null;
  } | null;
  stats: {
    messagesSent: number;
    tutorSessions: number;
    tuteeSessions: number;
    reviewsWritten: number;
    requestsPosted: number;
  };
};

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: AdminUser[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Action failed.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function del(id: string) {
    if (
      !confirm(
        "Delete this user? This removes their profile, messages, sessions, and reviews.",
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not delete user.");
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
        No users match your filters.
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

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentAdminId;
              return (
                <tr
                  key={u.id}
                  className="border-t border-white/5 align-top odd:bg-slate-950/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.profile?.fullName ?? u.email}
                        src={u.profile?.avatarUrl ?? null}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-white">
                          {u.profile?.fullName ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={u.role ?? ""}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      disabled={busyId === u.id}
                      className="h-8 rounded border border-white/10 bg-slate-950/60 px-2 text-xs text-white"
                    >
                      <option value="TUTEE">Tutee</option>
                      <option value="TUTOR">Tutor</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                      {u.isAdmin ? (
                        <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-cyan-100">
                          Admin
                        </span>
                      ) : null}
                      {u.isSuspended ? (
                        <span className="rounded-full bg-rose-400/20 px-2 py-0.5 text-rose-100">
                          Suspended
                        </span>
                      ) : null}
                      {!u.isAdmin && !u.isSuspended ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-400">
                          Active
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    <p>
                      {u.stats.tutorSessions + u.stats.tuteeSessions} sessions ·{" "}
                      {u.stats.messagesSent} msgs
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {u.stats.requestsPosted} requests · {u.stats.reviewsWritten}{" "}
                      reviews
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => patch(u.id, { isAdmin: !u.isAdmin })}
                        disabled={busyId === u.id || isSelf}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/10 disabled:opacity-40"
                      >
                        {u.isAdmin ? "Demote" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(u.id, { isSuspended: !u.isSuspended })}
                        disabled={busyId === u.id || isSelf}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-40 ${
                          u.isSuspended
                            ? "bg-emerald-400/80 text-slate-950 hover:bg-emerald-300"
                            : "bg-amber-400/80 text-slate-950 hover:bg-amber-300"
                        }`}
                      >
                        {u.isSuspended ? "Reactivate" : "Suspend"}
                      </button>
                      <button
                        type="button"
                        onClick={() => del(u.id)}
                        disabled={busyId === u.id || isSelf}
                        className="rounded-md bg-rose-500/80 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-400 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

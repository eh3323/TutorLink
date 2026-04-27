import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { listAdminSessions } from "@/lib/admin";
import {
  formatCurrencyCents,
  formatDateTime,
  formatMode,
  formatStatusLabel,
} from "@/lib/format";

export default async function AdminSessionsPage() {
  const sessions = await listAdminSessions();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Sessions
        </p>
        <h1 className="text-2xl font-semibold text-white">
          {sessions.length} sessions on TutorLink
        </h1>
        <p className="text-sm text-slate-400">
          Read-only admin view of all tutor ↔ tutee bookings.
        </p>
      </header>

      {sessions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
          No sessions yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Tutor</th>
                <th className="px-4 py-3">Tutee</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-white/5 odd:bg-slate-950/50"
                >
                  <td className="px-4 py-3 text-xs text-slate-300">
                    <Link
                      href={`/sessions/${s.id}`}
                      className="hover:text-cyan-200"
                    >
                      {formatDateTime(s.scheduledAt)}
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      {s.durationMinutes} min
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-200">
                    {s.subject.department} {s.subject.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={s.tutor.fullName}
                        src={s.tutor.avatarUrl}
                        size="xs"
                      />
                      <span className="text-xs text-white">{s.tutor.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={s.tutee.fullName}
                        src={s.tutee.avatarUrl}
                        size="xs"
                      />
                      <span className="text-xs text-white">{s.tutee.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {formatMode(s.mode)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {s.agreedRateCents != null
                      ? `${formatCurrencyCents(s.agreedRateCents)}/hr`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        s.status === "CONFIRMED"
                          ? "bg-emerald-400/15 text-emerald-200"
                          : s.status === "COMPLETED"
                            ? "bg-cyan-400/15 text-cyan-200"
                            : s.status === "CANCELLED"
                              ? "bg-rose-400/15 text-rose-200"
                              : "bg-amber-400/15 text-amber-200"
                      }`}
                    >
                      {formatStatusLabel(s.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

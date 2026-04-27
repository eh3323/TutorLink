import Link from "next/link";

import { listAdminTutors } from "@/lib/admin";
import { TutorVerificationTable } from "./tutor-table";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminTutorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = (params.status as string | undefined) ?? "";
  const tutors = await listAdminTutors({ status: status || null });

  const counts = {
    UNVERIFIED: tutors.filter((t) => t.verificationStatus === "UNVERIFIED").length,
    PENDING: tutors.filter((t) => t.verificationStatus === "PENDING").length,
    VERIFIED: tutors.filter((t) => t.verificationStatus === "VERIFIED").length,
  };

  const options: Array<{ value: string; label: string }> = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "VERIFIED", label: "Verified" },
    { value: "UNVERIFIED", label: "Unverified" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Tutor verification
        </p>
        <h1 className="text-2xl font-semibold text-white">
          {tutors.length} tutors shown
        </h1>
        <p className="text-sm text-slate-400">
          Move tutors between Unverified → Pending → Verified.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === status;
          return (
            <Link
              key={opt.value}
              href={
                opt.value ? `/admin/tutors?status=${opt.value}` : "/admin/tutors"
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-cyan-400/60 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["PENDING", "VERIFIED", "UNVERIFIED"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {k}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{counts[k]}</p>
          </div>
        ))}
      </div>

      <TutorVerificationTable tutors={tutors} />
    </div>
  );
}

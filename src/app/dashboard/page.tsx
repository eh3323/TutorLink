import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded bg-emerald-400/15 px-2 py-1 text-sm font-medium text-emerald-200">
              Auth working
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              TutorLink Dashboard
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              You are signed in. This is the first protected page in the project
              and the entry point for the next profile and marketplace work.
            </p>
          </div>
          <SignOutButton />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">User ID</p>
            <p className="mt-2 break-all text-sm text-white">{session.user.id}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-2 text-sm text-white">{session.user.email}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Role</p>
            <p className="mt-2 text-sm text-white">{session.user.role}</p>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Next backend tasks</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>Build profile read and update routes.</li>
            <li>Add role-aware onboarding after first sign-in.</li>
            <li>Protect tutor, request, and session endpoints with the session user.</li>
            <li>Connect dashboard cards to real profile and request data.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

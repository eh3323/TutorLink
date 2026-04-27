import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { canActAsTutee } from "@/lib/permissions";
import { listSubjects } from "@/lib/requests";
import { NewRequestForm } from "./new-request-form";

export default async function NewRequestPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/requests/new");
  }

  if (!canActAsTutee(session.user.role)) {
    return (
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">
            <h1 className="text-xl font-semibold">Switch to a tutee profile</h1>
            <p className="mt-2 text-sm">
              Only users with a tutee role can post tutoring requests. Visit{" "}
              <a href="/profile" className="underline">
                your profile
              </a>{" "}
              and switch to <strong>Tutee</strong> or <strong>Both</strong>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const subjects = await listSubjects();

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            New request
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">
            Tell tutors what you need help with
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            The more context you give, the better the match. Tutors can message you
            directly after reading your request.
          </p>
        </div>
        <NewRequestForm subjects={subjects} />
      </div>
    </main>
  );
}

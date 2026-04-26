import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="inline-flex rounded bg-cyan-400/15 px-2 py-1 text-sm font-medium text-cyan-200">
            TutorLink Sign In
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Start with your NYU email.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              This first auth integration uses a development credentials flow so
              the team can move forward without waiting on OAuth or email
              provider setup. It only accepts <code>@nyu.edu</code> addresses
              and creates the user record on first sign-in.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
              NYU email restriction enforced
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
              Session handling active
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
              User row created on first sign-in
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
              Tutor and tutee profile shells created
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold text-white">Development sign in</h2>
            <p className="text-sm leading-6 text-slate-300">
              Use a valid NYU email address. The selected role sets the initial
              profile shape for the account.
            </p>
          </div>
          <SignInForm />
        </section>
      </div>
    </main>
  );
}

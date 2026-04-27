import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Create an NYU account
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Two minutes, then you're on the platform.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300">
              Sign up with your <code>@nyu.edu</code> email and a password. We'll
              create your profile shell and let you start browsing or posting
              immediately.
            </p>
          </div>
          <ul className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {[
              "NYU-only. @nyu.edu verified on sign-up.",
              "Password is hashed with bcrypt — never stored in plain text.",
              "You can switch between tutor and tutee modes anytime.",
              "Upload a real avatar right after — it shows up everywhere.",
            ].map((item) => (
              <li
                key={item}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-4"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Create account</h2>
              <p className="mt-1 text-xs text-slate-400">
                Already registered?{" "}
                <Link href="/signin" className="font-medium text-cyan-300 hover:text-cyan-200">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
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
            Welcome back
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Sign in with your NYU email.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300">
              TutorLink accounts are protected with an email + password. We only
              allow <code>@nyu.edu</code> addresses, and we never store your
              password in plain text — it's hashed with bcrypt on the server.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {[
              "Signed session lives in a secure cookie",
              "bcrypt-hashed passwords only",
              "Role can be flipped in your profile",
              "Upload a real avatar after signing in",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-4"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Want to try the demo accounts? Seeded tutor/tutee emails use the password
            <code className="mx-1 rounded bg-white/5 px-1">tutorlink123</code>
            (e.g. <code>ava.chen@nyu.edu</code>).
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Sign in</h2>
              <p className="mt-1 text-xs text-slate-400">
                New to TutorLink?{" "}
                <Link href="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-white/5" />}>
            <SignInForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

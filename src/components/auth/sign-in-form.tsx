"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export function SignInForm() {
  const searchParams = useSearchParams();
  const fallback = searchParams?.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: fallback,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setError("Incorrect email or password. Try again or create an account.");
      return;
    }

    window.location.href = result.url ?? fallback;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          NYU email <span className="text-rose-300">*</span>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
          placeholder="netid@nyu.edu"
          autoComplete="email"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Password <span className="text-rose-300">*</span>
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputClass}
          placeholder="Your password"
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-slate-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
          Create one
        </Link>
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300";

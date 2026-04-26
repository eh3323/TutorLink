"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const roles = [
  { value: "TUTEE", label: "Tutee" },
  { value: "TUTOR", label: "Tutor" },
  { value: "BOTH", label: "Both" },
] as const;

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("TUTEE");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      fullName,
      role,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setError("Use a valid @nyu.edu email and complete all fields.");
      return;
    }

    window.location.href = result.url ?? "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300"
          placeholder="Erfu Hai"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200" htmlFor="email">
          NYU email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300"
          placeholder="netid@nyu.edu"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200" htmlFor="role">
          Starting role
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as (typeof roles)[number]["value"])}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}

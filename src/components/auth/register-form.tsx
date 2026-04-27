"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "TUTEE", label: "Tutee", hint: "I'm looking for tutoring help." },
  { value: "TUTOR", label: "Tutor", hint: "I want to tutor other NYU students." },
  { value: "BOTH", label: "Both", hint: "I want to do both." },
] as const;

type Role = (typeof ROLES)[number]["value"];

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("TUTEE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          role,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not create account.");
        setIsSubmitting(false);
        return;
      }

      const loginResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: "/profile",
      });

      if (!loginResult || loginResult.error) {
        setError("Account created, but auto sign-in failed. Try signing in manually.");
        setIsSubmitting(false);
        router.push("/signin");
        return;
      }

      window.location.href = loginResult.url ?? "/profile";
    } catch {
      setError("Network error. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name" required>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          className={inputClass}
          placeholder="Ava Chen"
        />
      </Field>
      <Field label="NYU email" required>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          pattern=".+@nyu\.edu"
          className={inputClass}
          placeholder="netid@nyu.edu"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Password" required>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={120}
            className={inputClass}
            placeholder="At least 8 chars"
          />
        </Field>
        <Field label="Confirm password" required>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            maxLength={120}
            className={inputClass}
            placeholder="Same password"
          />
        </Field>
      </div>

      <Field label="Sign up as">
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((item) => {
            const active = role === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setRole(item.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-cyan-400/60 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5"
                }`}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-[11px] text-slate-400">{item.hint}</p>
              </button>
            );
          })}
        </div>
      </Field>

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
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
      <p className="text-[11px] leading-5 text-slate-500">
        By continuing you agree to keep TutorLink focused on the NYU community and to
        handle private conversations and transcripts respectfully.
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label} {required ? <span className="text-rose-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300";

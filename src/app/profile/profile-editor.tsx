"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InitialData = {
  user: {
    id: string;
    email: string;
    role: string | null;
  };
  profile: {
    fullName: string;
    major: string | null;
    bio: string | null;
    school: string;
    graduationYear: number | null;
    avatarUrl: string | null;
  } | null;
  tutorProfile: {
    headline: string | null;
    hourlyRateCents: number | null;
    supportsOnline: boolean;
    supportsInPerson: boolean;
    defaultLocation: string | null;
    availabilityNotes: string | null;
    verificationStatus: string;
  } | null;
  tuteeProfile: {
    learningGoals: string | null;
    preferredBudgetCents: number | null;
    supportsOnline: boolean;
    supportsInPerson: boolean;
    availabilityNotes: string | null;
  } | null;
  capabilities: {
    canActAsTutor: boolean;
    canActAsTutee: boolean;
  };
};

const ROLES: Array<{ value: "TUTOR" | "TUTEE" | "BOTH"; label: string; description: string }> = [
  { value: "TUTEE", label: "Tutee", description: "I'm looking for tutoring help." },
  { value: "TUTOR", label: "Tutor", description: "I want to tutor other NYU students." },
  { value: "BOTH", label: "Both", description: "I want to do a bit of both." },
];

export function ProfileEditor({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [role, setRole] = useState<"TUTOR" | "TUTEE" | "BOTH">(
    (initialData.user.role as "TUTOR" | "TUTEE" | "BOTH") ?? "TUTEE",
  );

  const [fullName, setFullName] = useState(initialData.profile?.fullName ?? "");
  const [major, setMajor] = useState(initialData.profile?.major ?? "");
  const [bio, setBio] = useState(initialData.profile?.bio ?? "");
  const [graduationYear, setGraduationYear] = useState<string>(
    initialData.profile?.graduationYear?.toString() ?? "",
  );

  const [tutorHeadline, setTutorHeadline] = useState(initialData.tutorProfile?.headline ?? "");
  const [tutorRate, setTutorRate] = useState<string>(
    initialData.tutorProfile?.hourlyRateCents != null
      ? (initialData.tutorProfile.hourlyRateCents / 100).toString()
      : "",
  );
  const [tutorOnline, setTutorOnline] = useState(initialData.tutorProfile?.supportsOnline ?? true);
  const [tutorInPerson, setTutorInPerson] = useState(
    initialData.tutorProfile?.supportsInPerson ?? false,
  );
  const [tutorLocation, setTutorLocation] = useState(
    initialData.tutorProfile?.defaultLocation ?? "",
  );
  const [tutorAvailability, setTutorAvailability] = useState(
    initialData.tutorProfile?.availabilityNotes ?? "",
  );
  const [tutorVerification, setTutorVerification] = useState(
    initialData.tutorProfile?.verificationStatus ?? "UNVERIFIED",
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function submitForVerification() {
    setVerifyError(null);
    setIsVerifying(true);
    try {
      const response = await fetch("/api/profile/verify", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setVerifyError(payload?.error?.message ?? "Could not submit for verification.");
      } else {
        setTutorVerification(payload.data.verificationStatus);
        router.refresh();
      }
    } catch {
      setVerifyError("Network error. Try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  const [tuteeGoals, setTuteeGoals] = useState(initialData.tuteeProfile?.learningGoals ?? "");
  const [tuteeBudget, setTuteeBudget] = useState<string>(
    initialData.tuteeProfile?.preferredBudgetCents != null
      ? (initialData.tuteeProfile.preferredBudgetCents / 100).toString()
      : "",
  );
  const [tuteeOnline, setTuteeOnline] = useState(initialData.tuteeProfile?.supportsOnline ?? true);
  const [tuteeInPerson, setTuteeInPerson] = useState(
    initialData.tuteeProfile?.supportsInPerson ?? false,
  );
  const [tuteeAvailability, setTuteeAvailability] = useState(
    initialData.tuteeProfile?.availabilityNotes ?? "",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTimestamp, setSuccessTimestamp] = useState<number | null>(null);

  const showTutor = useMemo(() => role === "TUTOR" || role === "BOTH", [role]);
  const showTutee = useMemo(() => role === "TUTEE" || role === "BOTH", [role]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessTimestamp(null);
    setIsSubmitting(true);

    const body: Record<string, unknown> = {
      role,
      profile: {
        fullName: fullName.trim(),
        major: major.trim() || null,
        bio: bio.trim() || null,
        graduationYear: graduationYear.trim() ? Number(graduationYear) : null,
      },
    };

    if (showTutor) {
      body.tutorProfile = {
        headline: tutorHeadline.trim() || null,
        hourlyRateCents: tutorRate.trim() ? Math.round(Number(tutorRate) * 100) : null,
        supportsOnline: tutorOnline,
        supportsInPerson: tutorInPerson,
        defaultLocation: tutorLocation.trim() || null,
        availabilityNotes: tutorAvailability.trim() || null,
      };
    }

    if (showTutee) {
      body.tuteeProfile = {
        learningGoals: tuteeGoals.trim() || null,
        preferredBudgetCents: tuteeBudget.trim() ? Math.round(Number(tuteeBudget) * 100) : null,
        supportsOnline: tuteeOnline,
        supportsInPerson: tuteeInPerson,
        availabilityNotes: tuteeAvailability.trim() || null,
      };
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not save profile.");
      } else {
        setSuccessTimestamp(Date.now());
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">I'm signing up as</h2>
        <p className="mt-1 text-sm text-slate-400">
          You can update this later if you want to switch sides.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ROLES.map((item) => {
            const active = role === item.value;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => setRole(item.value)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-cyan-400/60 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5"
                }`}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Basic information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
              placeholder="Ava Chen"
            />
          </Field>
          <Field label="Major">
            <input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className={inputClass}
              placeholder="Computer Science"
            />
          </Field>
          <Field label="Graduation year">
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className={inputClass}
              placeholder="2027"
              min={2000}
              max={2050}
            />
          </Field>
          <Field label="NYU email">
            <input value={initialData.user.email} readOnly className={`${inputClass} opacity-60`} />
          </Field>
          <Field label="Short bio" className="sm:col-span-2">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={`${inputClass} min-h-24`}
              placeholder="A short intro. What are you studying? What are you best at teaching?"
            />
          </Field>
        </div>
      </section>

      {showTutor ? (
        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <h2 className="text-lg font-semibold text-white">Tutor profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Shown to tutees browsing the marketplace.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Tutor headline" className="sm:col-span-2">
              <input
                value={tutorHeadline}
                onChange={(e) => setTutorHeadline(e.target.value)}
                className={inputClass}
                placeholder="Intro CS + data structures tutor"
              />
            </Field>
            <Field label="Hourly rate (USD)">
              <input
                type="number"
                step="1"
                min={0}
                max={10000}
                value={tutorRate}
                onChange={(e) => setTutorRate(e.target.value)}
                className={inputClass}
                placeholder="35"
              />
            </Field>
            <Field label="Default location">
              <input
                value={tutorLocation}
                onChange={(e) => setTutorLocation(e.target.value)}
                className={inputClass}
                placeholder="Bobst Library"
              />
            </Field>
            <Field label="I tutor...">
              <div className="flex items-center gap-4">
                <Toggle
                  checked={tutorOnline}
                  onChange={setTutorOnline}
                  label="Online"
                />
                <Toggle
                  checked={tutorInPerson}
                  onChange={setTutorInPerson}
                  label="In person"
                />
              </div>
            </Field>
            <Field label="Availability notes">
              <input
                value={tutorAvailability}
                onChange={(e) => setTutorAvailability(e.target.value)}
                className={inputClass}
                placeholder="Weeknights after 7pm, Sundays all day"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Verification</p>
              <p className="mt-1 text-xs text-slate-400">
                Verified tutors get a badge and rank higher in search. Submit your
                profile and an admin will review it shortly.
              </p>
              <p className="mt-2 text-xs text-cyan-200">
                Current status: {formatVerificationStatus(tutorVerification)}
              </p>
              {verifyError ? (
                <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                  {verifyError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={submitForVerification}
              disabled={
                isVerifying ||
                tutorVerification === "VERIFIED" ||
                tutorVerification === "PENDING"
              }
              className="inline-flex h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tutorVerification === "VERIFIED"
                ? "Verified"
                : tutorVerification === "PENDING"
                  ? "Awaiting review"
                  : isVerifying
                    ? "Submitting…"
                    : "Submit for verification"}
            </button>
          </div>
        </section>
      ) : null}

      {showTutee ? (
        <section className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-6">
          <h2 className="text-lg font-semibold text-white">Tutee profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Helps tutors understand what you need help with.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Learning goals" className="sm:col-span-2">
              <textarea
                value={tuteeGoals}
                onChange={(e) => setTuteeGoals(e.target.value)}
                rows={3}
                className={`${inputClass} min-h-24`}
                placeholder="What are you trying to learn or improve?"
              />
            </Field>
            <Field label="Preferred budget (USD)">
              <input
                type="number"
                step="1"
                min={0}
                max={10000}
                value={tuteeBudget}
                onChange={(e) => setTuteeBudget(e.target.value)}
                className={inputClass}
                placeholder="25"
              />
            </Field>
            <Field label="I prefer...">
              <div className="flex items-center gap-4">
                <Toggle checked={tuteeOnline} onChange={setTuteeOnline} label="Online" />
                <Toggle
                  checked={tuteeInPerson}
                  onChange={setTuteeInPerson}
                  label="In person"
                />
              </div>
            </Field>
            <Field label="Availability notes" className="sm:col-span-2">
              <input
                value={tuteeAvailability}
                onChange={(e) => setTuteeAvailability(e.target.value)}
                className={inputClass}
                placeholder="Tuesdays and Thursdays after 5pm"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {successTimestamp ? (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Saved. Changes are live.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function formatVerificationStatus(status: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING") return "Pending review";
  return "Unverified";
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label} {required ? <span className="text-rose-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
        checked
          ? "border-cyan-400/60 bg-cyan-400/10 text-white"
          : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/5"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${checked ? "bg-cyan-300" : "bg-slate-600"}`}
      />
      {label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300";

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type InitialData = {
  user: {
    id: string;
    email: string;
    role: string | null;
    isAdmin?: boolean;
    verificationStatus?: string;
    verificationNote?: string | null;
    verificationSubmittedAt?: Date | string | null;
    verificationDocument?: {
      name: string;
      mimeType: string;
      sizeBytes: number | null;
    } | null;
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
  const [verification, setVerification] = useState(
    initialData.user.verificationStatus ?? "UNVERIFIED",
  );
  const [verificationNote, setVerificationNote] = useState(
    initialData.user.verificationNote ?? "",
  );
  const [verificationDocument, setVerificationDocument] = useState(
    initialData.user.verificationDocument ?? null,
  );
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyOk, setVerifyOk] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFileName, setVerifyFileName] = useState<string | null>(null);
  const verifyFileRef = useRef<HTMLInputElement | null>(null);

  function onVerifyFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setVerifyError(null);
    if (!file) {
      setVerifyFileName(null);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setVerifyError("Document must be 8 MB or smaller.");
      if (verifyFileRef.current) verifyFileRef.current.value = "";
      setVerifyFileName(null);
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      setVerifyError("Use PDF, DOC, DOCX, PNG, JPEG, or WEBP.");
      if (verifyFileRef.current) verifyFileRef.current.value = "";
      setVerifyFileName(null);
      return;
    }
    setVerifyFileName(file.name);
  }

  async function submitForVerification() {
    setVerifyError(null);
    setVerifyOk(null);

    const file = verifyFileRef.current?.files?.[0] ?? null;
    if (!file) {
      setVerifyError(
        "Attach a PDF, Word document, or image proving your NYU identity.",
      );
      return;
    }

    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("note", verifyMessage.trim());
      const response = await fetch("/api/profile/verify", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setVerifyError(
          payload?.error?.message ?? "Could not submit for verification.",
        );
      } else {
        setVerification(payload.data.verificationStatus);
        setVerificationNote(payload.data.verificationNote ?? verifyMessage);
        setVerificationDocument(
          payload.data.verificationDocumentUrl
            ? {
                name:
                  payload.data.verificationDocumentName ?? file.name,
                mimeType:
                  payload.data.verificationDocumentType ?? file.type,
                sizeBytes:
                  payload.data.verificationDocumentSize ?? file.size,
              }
            : verificationDocument,
        );
        setVerifyMessage("");
        setVerifyFileName(null);
        if (verifyFileRef.current) verifyFileRef.current.value = "";
        setVerifyOk(
          "Submitted. An admin will review your account shortly.",
        );
        router.refresh();
      }
    } catch {
      setVerifyError("Network error. Try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function formatBytes(bytes: number | null) {
    if (bytes == null) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Identity verification
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Open to every TutorLink user. Upload a document that proves
              you’re an NYU student (e.g. NYU ID card photo, course
              registration PDF, or NYU.edu email screenshot). An admin will
              review and approve your account.
            </p>
          </div>
          <span
            className={`mt-2 inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-wide sm:mt-0 ${
              verification === "VERIFIED"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : verification === "PENDING"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {formatVerificationStatus(verification)}
          </span>
        </div>

        {verification === "VERIFIED" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <p>
              You’re verified. The badge appears wherever you are listed on the
              platform.
            </p>
            {verificationDocument ? (
              <a
                href="/api/profile/verify/document"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-slate-950/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
              >
                Download submitted document ({verificationDocument.name})
              </a>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {verification === "PENDING" ? (
              <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                Your submission is in the queue. An admin will approve it
                shortly. You can re-upload a new document below if you need to
                replace it.
              </p>
            ) : null}

            {verificationDocument ? (
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">Last upload</p>
                  <p className="truncate">
                    {verificationDocument.name}{" "}
                    <span className="text-slate-400">
                      · {verificationDocument.mimeType}
                      {verificationDocument.sizeBytes
                        ? ` · ${formatBytes(verificationDocument.sizeBytes)}`
                        : ""}
                    </span>
                  </p>
                </div>
                <a
                  href="/api/profile/verify/document"
                  className="inline-flex shrink-0 items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  Download
                </a>
              </div>
            ) : null}

            {verificationNote ? (
              <p className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs italic text-slate-200">
                Note for admin: “{verificationNote}”
              </p>
            ) : null}

            <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/30 p-4">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Verification document <span className="text-rose-300">*</span>
              </label>
              <p className="text-xs text-slate-400">
                PDF, DOC, DOCX, PNG, JPEG, or WEBP — up to 8 MB. Only admins
                can view your file.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => verifyFileRef.current?.click()}
                  className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
                >
                  {verifyFileName ? "Choose different file" : "Choose file"}
                </button>
                <span className="text-xs text-slate-300">
                  {verifyFileName ?? "No file selected"}
                </span>
                <input
                  ref={verifyFileRef}
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onVerifyFileChange}
                />
              </div>
            </div>

            <textarea
              rows={3}
              value={verifyMessage}
              onChange={(e) => setVerifyMessage(e.target.value)}
              maxLength={600}
              className={`${inputClass} min-h-20`}
              placeholder="Optional: anything else the admin should know (NetID, link to NYU profile, etc.)"
            />
            <button
              type="button"
              onClick={submitForVerification}
              disabled={isVerifying || !verifyFileName}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-300 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying
                ? "Submitting…"
                : verification === "PENDING"
                  ? "Resubmit document"
                  : "Submit for verification"}
            </button>
          </div>
        )}

        {verifyOk ? (
          <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
            {verifyOk}
          </p>
        ) : null}
        {verifyError ? (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {verifyError}
          </p>
        ) : null}
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

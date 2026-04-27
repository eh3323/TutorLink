"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Subject = {
  id: string;
  department: string;
  code: string;
  name: string;
  label: string;
};

export function NewRequestForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredMode, setPreferredMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [locationText, setLocationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          title: title.trim(),
          description: description.trim(),
          preferredMode,
          budgetMinCents: budgetMin.trim() ? Math.round(Number(budgetMin) * 100) : null,
          budgetMaxCents: budgetMax.trim() ? Math.round(Number(budgetMax) * 100) : null,
          locationText: locationText.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not post request.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/requests/${payload.data.id}`);
    } catch {
      setError("Network error. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <Field label="Subject" required>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className={inputClass}
            required
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Request title" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            className={inputClass}
            placeholder="Need help reviewing trees and recursion before midterm"
          />
        </Field>
        <Field label="Description" required>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            className={`${inputClass} min-h-32`}
            placeholder="What topics do you need help with? How much time do you have? Any specific questions?"
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <Field label="Preferred mode" required>
          <div className="flex gap-3">
            <ModeButton
              active={preferredMode === "ONLINE"}
              onClick={() => setPreferredMode("ONLINE")}
            >
              Online
            </ModeButton>
            <ModeButton
              active={preferredMode === "IN_PERSON"}
              onClick={() => setPreferredMode("IN_PERSON")}
            >
              In person
            </ModeButton>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget min (USD)">
            <input
              type="number"
              min={0}
              max={1000}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className={inputClass}
              placeholder="20"
            />
          </Field>
          <Field label="Budget max (USD)">
            <input
              type="number"
              min={0}
              max={1000}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className={inputClass}
              placeholder="40"
            />
          </Field>
        </div>
        <Field label="Preferred location (optional)">
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className={inputClass}
            placeholder="Bobst Library, Zoom, etc."
          />
        </Field>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !subjectId}
          className="inline-flex h-11 items-center rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Posting…" : "Post request"}
        </button>
      </div>
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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition ${
        active
          ? "border-cyan-400/60 bg-cyan-400/10 text-white"
          : "border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300";

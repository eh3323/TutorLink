"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ViewerRole = "TUTOR" | "TUTEE";

type Props = {
  sessionId: string;
  // controls which sub-criterion shows up for the 4th slot
  viewerRole: ViewerRole;
  counterpartName: string;
};

const COMMON_CRITERIA = [
  { key: "punctuality", label: "Punctuality", hint: "Showed up on time?" },
  { key: "preparation", label: "Preparation", hint: "Came in ready?" },
  { key: "communication", label: "Communication", hint: "Clear and easy to follow?" },
] as const;

type StarRowKey =
  | "punctuality"
  | "preparation"
  | "communication"
  | "helpfulness"
  | "respectful";

function StarRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[11px] text-slate-400">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition ${
              value != null && value >= n
                ? "bg-cyan-300 text-slate-950"
                : "border border-white/10 bg-slate-950/60 text-slate-300 hover:bg-slate-900"
            }`}
            aria-label={`${label} ${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ sessionId, viewerRole, counterpartName }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [criteria, setCriteria] = useState<
    Record<StarRowKey, number | null>
  >({
    punctuality: null,
    preparation: null,
    communication: null,
    helpfulness: null,
    respectful: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRow(key: StarRowKey, value: number | null) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating,
          comment: comment.trim() || null,
          criteria,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not submit review.");
      } else {
        setComment("");
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // tutee scoring tutor → ask "helpfulness"; tutor scoring tutee → ask "respectful"
  const fourthRow =
    viewerRole === "TUTEE"
      ? {
          key: "helpfulness" as const,
          label: "Helpfulness",
          hint: "Did they actually help you learn?",
        }
      : {
          key: "respectful" as const,
          label: "Respectful",
          hint: "Treated you and your time well?",
        };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">
          Leave a review for {counterpartName}
        </p>
        <p className="text-[11px] text-slate-400">
          Reviews are tied to a completed session and shown as Verified on
          their profile.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Overall
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-9 w-9 rounded-lg text-base font-semibold transition ${
                rating >= n
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-slate-300"
              }`}
              aria-label={`Overall ${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {COMMON_CRITERIA.map((row) => (
          <StarRow
            key={row.key}
            label={row.label}
            hint={row.hint}
            value={criteria[row.key]}
            onChange={(v) => setRow(row.key, v)}
          />
        ))}
        <StarRow
          key={fourthRow.key}
          label={fourthRow.label}
          hint={fourthRow.hint}
          value={criteria[fourthRow.key]}
          onChange={(v) => setRow(fourthRow.key, v)}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={
          viewerRole === "TUTEE"
            ? "What made this session helpful? (optional)"
            : "How was working with this student? (optional)"
        }
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
      />
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}

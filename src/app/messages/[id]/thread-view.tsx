"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatRelativeTime } from "@/lib/format";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string | Date;
  sender: { id: string; fullName: string; avatarUrl?: string | null };
};

type Participant = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
};

type Subject = {
  id: string;
  department: string;
  code: string;
  name: string;
  label: string;
};

type Props = {
  threadId: string;
  currentUserId: string;
  initialMessages: Message[];
  participants: { tutor: Participant; tutee: Participant };
  request: {
    id: string;
    title: string;
    subject: { id: string; department: string; code: string; name: string; label: string };
  } | null;
  subjects: Subject[];
};

export function ThreadView({
  threadId,
  currentUserId,
  initialMessages,
  participants,
  request,
  subjects,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const counterpart =
    currentUserId === participants.tutor.id ? participants.tutee : participants.tutor;
  const viewerIsTutor = currentUserId === participants.tutor.id;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not send message.");
      } else {
        setMessages((prev) => [...prev, payload.data.message]);
        setBody("");
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5">
      <header className="flex items-center gap-3 border-b border-white/10 p-5">
        <Link href={`/users/${counterpart.id}`} className="shrink-0">
          <Avatar name={counterpart.fullName} src={counterpart.avatarUrl} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/users/${counterpart.id}`}
            className="text-sm font-semibold text-white hover:underline"
          >
            {counterpart.fullName}
          </Link>
          <p className="text-xs text-slate-400">
            You as {viewerIsTutor ? "tutor" : "tutee"} · {counterpart.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowScheduler((v) => !v)}
            className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
          >
            {showScheduler ? "Close" : "Schedule session"}
          </button>
          <Link
            href={`/users/${counterpart.id}`}
            className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 sm:block"
          >
            View profile
          </Link>
        </div>
      </header>

      {request ? (
        <div className="mx-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs text-cyan-100">
          <span className="font-semibold">Request:</span>{" "}
          <Link href={`/requests/${request.id}`} className="underline">
            {request.title}
          </Link>
          <span className="ml-2 text-slate-400">
            {request.subject.department} {request.subject.code}
          </span>
        </div>
      ) : null}

      {showScheduler ? (
        <div className="mx-5 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
          <ScheduleForm
            threadId={threadId}
            tutorId={participants.tutor.id}
            tuteeId={participants.tutee.id}
            defaultSubjectId={request?.subject.id ?? subjects[0]?.id ?? ""}
            requestId={request?.id ?? null}
            subjects={subjects}
          />
        </div>
      ) : null}

      <div
        ref={listRef}
        className="flex max-h-[60vh] min-h-[40vh] flex-col gap-3 overflow-y-auto px-5 pb-2"
      >
        {messages.length === 0 ? (
          <div className="m-auto text-center text-sm text-slate-400">
            Say hi to start the conversation.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine ? (
                  <Avatar
                    name={message.sender.fullName}
                    src={message.sender.avatarUrl ?? null}
                    size="xs"
                  />
                ) : null}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-6 ${
                    isMine
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/10 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {formatRelativeTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex flex-col gap-2 border-t border-white/10 p-5"
      >
        {error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write a message…"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
          />
          <button
            type="submit"
            disabled={isSending || !body.trim()}
            className="inline-flex h-11 items-center rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}

function toLocalInput(defaultDate: Date) {
  const tzOffset = defaultDate.getTimezoneOffset() * 60000;
  return new Date(defaultDate.getTime() - tzOffset).toISOString().slice(0, 16);
}

function ScheduleForm({
  threadId,
  tutorId,
  tuteeId,
  defaultSubjectId,
  requestId,
  subjects,
}: {
  threadId: string;
  tutorId: string;
  tuteeId: string;
  defaultSubjectId: string;
  requestId: string | null;
  subjects: Subject[];
}) {
  const router = useRouter();
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(19, 0, 0, 0);
    return d;
  }, []);
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(defaultDate));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [mode, setMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [locationText, setLocationText] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId,
          tuteeId,
          subjectId,
          threadId,
          requestId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes,
          mode,
          locationText: locationText.trim() || null,
          agreedRateCents: agreedRate.trim() ? Math.round(Number(agreedRate) * 100) : null,
          notes: notes.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not create session.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/sessions/${payload.data.id}`);
    } catch {
      setError("Network error. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-white">Schedule a session</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs text-slate-400">
          Subject
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          When
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          Duration (minutes)
          <input
            type="number"
            min={15}
            max={600}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "ONLINE" | "IN_PERSON")}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          >
            <option value="ONLINE">Online</option>
            <option value="IN_PERSON">In person</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs text-slate-400 sm:col-span-2">
          Location / meeting link
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
            placeholder="Bobst 5th floor or Zoom URL"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          Rate (USD/hr)
          <input
            type="number"
            min={0}
            max={10000}
            value={agreedRate}
            onChange={(e) => setAgreedRate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400 sm:col-span-2">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting || !subjectId}
        className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}

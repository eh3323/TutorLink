"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

type Person = {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl: string | null;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string | Date;
  sender: { id: string; fullName: string; avatarUrl?: string | null };
};

type Props = {
  sessionId: string;
  threadId: string;
  roomToken: string;
  scheduledAtIso: string;
  durationMinutes: number;
  subjectLabel: string;
  me: Person;
  counterpart: Person;
};

function fmtRemaining(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionRoom({
  sessionId,
  threadId,
  roomToken,
  scheduledAtIso,
  durationMinutes,
  subjectLabel,
  me,
  counterpart,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [videoOpen, setVideoOpen] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const scheduledAt = useMemo(() => new Date(scheduledAtIso), [scheduledAtIso]);
  const sessionEnd = useMemo(
    () => new Date(scheduledAt.getTime() + durationMinutes * 60_000),
    [scheduledAt, durationMinutes],
  );
  const startsIn = scheduledAt.getTime() - now;
  const endsIn = sessionEnd.getTime() - now;
  const status =
    startsIn > 0
      ? `starts in ${fmtRemaining(startsIn)}`
      : endsIn > 0
        ? `${fmtRemaining(endsIn)} left`
        : "in grace period";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch(`/api/messages?threadId=${threadId}&limit=80`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!cancelled && payload?.ok && Array.isArray(payload.data?.messages)) {
          const next = payload.data.messages as Message[];
          setMessages(next);
          if (next.length > 0) {
            const newest = next[next.length - 1];
            if (lastIdRef.current && lastIdRef.current !== newest.id && listRef.current) {
              requestAnimationFrame(() => {
                if (listRef.current) {
                  listRef.current.scrollTop = listRef.current.scrollHeight;
                }
              });
            }
            lastIdRef.current = newest.id;
          }
        }
      } catch {
        // ignore, try again next tick
      }
    }
    pull();
    const id = setInterval(pull, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [threadId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "could not send message.");
      } else {
        setBody("");
        setMessages((prev) => [...prev, payload.data.message]);
      }
    } catch {
      setError("network error.");
    } finally {
      setSending(false);
    }
  }

  const jitsiSrc = useMemo(() => {
    const room = `tutorlink-${sessionId}-${roomToken}`;
    const displayName = encodeURIComponent(me.fullName || me.email || "participant");
    const email = encodeURIComponent(me.email ?? "");
    const params = new URLSearchParams({
      "config.startWithVideoMuted": "false",
      "config.prejoinPageEnabled": "false",
      "config.disableDeepLinking": "true",
    });
    return `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=%22${displayName}%22&userInfo.email=%22${email}%22&${params.toString()}`;
  }, [sessionId, roomToken, me.fullName, me.email]);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href={`/sessions/${sessionId}`}
              className="text-xs text-slate-400 hover:text-white"
            >
              ← Back to session
            </Link>
            <h1 className="mt-1 truncate text-xl font-semibold text-white">
              Live with {counterpart.fullName} · {subjectLabel}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Scheduled for {formatDateTime(scheduledAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 font-semibold text-cyan-100">
              {status}
            </span>
            <button
              type="button"
              onClick={() => setVideoOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200 hover:bg-white/10"
            >
              {videoOpen ? "Hide video" : "Show video"}
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            {videoOpen ? (
              <iframe
                key={jitsiSrc}
                src={jitsiSrc}
                allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
                className="h-[60vh] w-full"
                style={{ minHeight: 360 }}
              />
            ) : (
              <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
                <p>Video paused.</p>
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Resume video
                </button>
              </div>
            )}
          </div>

          <div className="flex h-[60vh] flex-col rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Avatar name={counterpart.fullName} src={counterpart.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {counterpart.fullName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  Live chat — auto-refreshes every 3s
                </p>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="m-auto text-center text-xs text-slate-400">
                  No messages yet. Say hi while you wait.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === me.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {!mine ? (
                        <Avatar
                          name={m.sender.fullName}
                          src={m.sender.avatarUrl ?? null}
                          size="xs"
                        />
                      ) : null}
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                          mine ? "bg-cyan-400 text-slate-950" : "bg-white/10 text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${mine ? "text-slate-800" : "text-slate-400"}`}
                        >
                          {formatRelativeTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message…"
                maxLength={2000}
                className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-300"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
            {error ? (
              <p className="mx-3 mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          Video powered by Jitsi Meet. The first person to enter creates the
          room — share this page with no one but the other participant.
        </p>
      </div>
    </main>
  );
}

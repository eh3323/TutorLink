"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { MathText } from "@/components/math-text";
import { formatCurrencyCents, formatDateTime, formatRelativeTime } from "@/lib/format";

const WhiteboardPanel = dynamic(() => import("./whiteboard-panel"), {
  ssr: false,
  loading: () => <PanelSkeleton label="Loading whiteboard…" />,
});
const CodePanel = dynamic(() => import("./code-panel"), {
  ssr: false,
  loading: () => <PanelSkeleton label="Loading code editor…" />,
});
const LiveKitPanel = dynamic(() => import("./livekit-panel"), {
  ssr: false,
  loading: () => <PanelSkeleton label="Connecting to room…" />,
});

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
  agreedRateCents: number | null;
  subjectLabel: string;
  livekitEnabled: boolean;
  me: Person;
  counterpart: Person;
};

type Tab = "video" | "whiteboard" | "code";

function fmtRemaining(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtElapsed(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-slate-400">
      {label}
    </div>
  );
}

export function SessionRoom({
  sessionId,
  threadId,
  roomToken,
  scheduledAtIso,
  durationMinutes,
  agreedRateCents,
  subjectLabel,
  livekitEnabled,
  me,
  counterpart,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>("video");
  const [chatOpen, setChatOpen] = useState(true);
  const [useJitsi, setUseJitsi] = useState(!livekitEnabled);
  const [pipMinimised, setPipMinimised] = useState(false);
  const [canvasBox, setCanvasBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const mainCanvasRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const scheduledAt = useMemo(() => new Date(scheduledAtIso), [scheduledAtIso]);
  const sessionEnd = useMemo(
    () => new Date(scheduledAt.getTime() + durationMinutes * 60_000),
    [scheduledAt, durationMinutes],
  );

  const elapsedSec = Math.max(0, (now - scheduledAt.getTime()) / 1000);
  const meterAmountCents =
    agreedRateCents != null
      ? Math.round((agreedRateCents * elapsedSec) / 3600)
      : null;

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

  // measure the main canvas slot so the fixed-position video layer can match
  // its position/size when tab=video. updates on resize, scroll, layout shift,
  // tab switches and chat open/close.
  useEffect(() => {
    const el = mainCanvasRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setCanvasBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [tab, chatOpen]);

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
    void pull();
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
    setChatError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setChatError(payload?.error?.message ?? "could not send message.");
      } else {
        setBody("");
        setMessages((prev) => [...prev, payload.data.message]);
      }
    } catch {
      setChatError("network error.");
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

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "video", label: "Video" },
    { id: "whiteboard", label: "Whiteboard" },
    { id: "code", label: "Code" },
  ];

  const videoIsLiveKit = livekitEnabled && !useJitsi;

  const videoStyle: React.CSSProperties =
    tab === "video" && canvasBox
      ? {
          position: "fixed",
          top: canvasBox.top,
          left: canvasBox.left,
          width: canvasBox.width,
          height: canvasBox.height,
          zIndex: 30,
        }
      : tab === "video"
        ? { display: "none" }
        : pipMinimised
          ? {
              position: "fixed",
              right: 16,
              bottom: 16,
              width: 220,
              height: 36,
              zIndex: 40,
            }
          : {
              position: "fixed",
              right: 16,
              bottom: 16,
              width: 320,
              height: 200,
              zIndex: 40,
            };

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 font-semibold text-cyan-100">
              {status}
            </span>
            {agreedRateCents != null ? (
              <span
                className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-semibold text-amber-100"
                title="Live billing meter — accumulates from the scheduled start"
              >
                {fmtElapsed(elapsedSec)} ·{" "}
                {meterAmountCents != null
                  ? formatCurrencyCents(Math.max(0, meterAmountCents))
                  : "$—"}
              </span>
            ) : (
              <span
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300"
                title="No agreed rate set on this session"
              >
                {fmtElapsed(elapsedSec)} elapsed
              </span>
            )}
            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200 hover:bg-white/10"
            >
              {chatOpen ? "Hide chat" : "Show chat"}
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition ${
                tab === t.id
                  ? "border-cyan-300 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
          {livekitEnabled ? (
            <button
              type="button"
              onClick={() => setUseJitsi((v) => !v)}
              className="ml-auto text-[10px] uppercase tracking-wide text-slate-500 hover:text-slate-200"
            >
              {useJitsi ? "Try LiveKit" : "Fall back to Jitsi"}
            </button>
          ) : null}
        </div>

        <div
          className={`grid gap-4 ${chatOpen ? "lg:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}
        >
          {/* main canvas — whiteboard + code stay mounted with their tabs
              just hidden via classes so live sync isn't torn down. the
              video layer below is rendered once outside this div and gets
              repositioned via a measured fixed-position style. */}
          <div className="relative">
            <div
              ref={mainCanvasRef}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black"
            >
              <div className="relative h-[62vh] min-h-[400px]">
                <div
                  className={`absolute inset-0 ${tab === "whiteboard" ? "" : "pointer-events-none invisible"}`}
                >
                  <WhiteboardPanel roomId={`tutorlink-wb-${roomToken}`} />
                </div>

                <div
                  className={`absolute inset-0 ${tab === "code" ? "" : "pointer-events-none invisible"}`}
                >
                  <CodePanel
                    sessionId={sessionId}
                    displayName={me.fullName || me.email || "participant"}
                  />
                </div>

                {tab === "video" ? (
                  <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-wide text-slate-700">
                    Camera in main canvas
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {chatOpen ? (
            <div className="flex h-[62vh] flex-col rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <Avatar name={counterpart.fullName} src={counterpart.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {counterpart.fullName}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    Live chat — supports $LaTeX$ and $$blocks$$
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
                          <MathText
                            className="whitespace-pre-wrap break-words"
                            text={m.body}
                          />
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
              {chatError ? (
                <p className="mx-3 mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                  {chatError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="text-center text-[11px] text-slate-500">
          {videoIsLiveKit
            ? "Private LiveKit room — only invited participants can join."
            : "Public Jitsi fallback. For real privacy, set up LiveKit."}{" "}
          Whiteboard + code sync live across both sides.
        </p>
      </div>

      {/* the video container is rendered exactly once across the lifetime of
          the page. its style switches between fullsize (matched to the main
          canvas via measurement) and a small pip thumbnail. children never
          remount, so the call/camera/mic stay alive through tab changes. */}
      <div
        style={videoStyle}
        className="overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
      >
        {tab !== "video" ? (
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
            <button
              type="button"
              onClick={() => setTab("video")}
              className="font-semibold uppercase tracking-wide hover:text-white"
            >
              Camera · click to expand
            </button>
            <button
              type="button"
              onClick={() => setPipMinimised((v) => !v)}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 hover:bg-white/10"
              aria-label={pipMinimised ? "Show camera" : "Hide camera"}
            >
              {pipMinimised ? "▴" : "▾"}
            </button>
          </div>
        ) : null}
        <div
          className={
            tab === "video"
              ? "h-full w-full"
              : `${pipMinimised ? "hidden" : ""} h-[calc(100%-1.75rem)] w-full`
          }
        >
          {videoIsLiveKit ? (
            <LiveKitPanel
              sessionId={sessionId}
              onUnavailable={() => setUseJitsi(true)}
            />
          ) : (
            <iframe
              key={jitsiSrc}
              src={jitsiSrc}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              className="h-full w-full"
            />
          )}
        </div>
      </div>
    </main>
  );
}

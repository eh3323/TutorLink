"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatDateTime } from "@/lib/format";

type Notification = {
  threadId: string;
  snippet: string;
  createdAt: string;
};

type Payload = {
  unreadCount: number;
  recent: Notification[];
};

const POLL_ACTIVE_MS = 8000;
const POLL_HIDDEN_MS = 30000;

// short oscillator beep so a new message actually pings the user. keeps
// volume low and cuts off after ~120ms so it's not annoying. uses the
// shared web audio context so we don't keep allocating new ones.
let audioCtx: AudioContext | null = null;
function beep() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // audio is best-effort; ignore browser quirks
  }
}

function showDesktopNotification(snippet: string, threadId: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const note = new Notification("New TutorLink message", {
      body: snippet || "(empty)",
      icon: "/favicon.ico",
      tag: `tutorlink-${threadId}`,
      // re-fire if the same thread sends another one
      renotify: true,
    } as NotificationOptions);
    note.onclick = () => {
      window.focus();
      window.location.href = `/messages/${threadId}`;
      note.close();
    };
  } catch {
    // safari sometimes throws on bad option shapes; ignore
  }
}

export function NotificationsButton() {
  const [data, setData] = useState<Payload>({ unreadCount: 0, recent: [] });
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (cancelledRef.current || !json.ok) return;
      const next = json.data as Payload;

      // figure out what's actually new since the last poll: a new entry
      // means we've never seen this threadId+createdAt combo before
      const nextKeys = new Set(
        next.recent.map((r) => `${r.threadId}:${r.createdAt}`),
      );
      const arrivals = next.recent.filter(
        (r) => !seenIdsRef.current.has(`${r.threadId}:${r.createdAt}`),
      );

      setData(next);

      // skip the initial load — we don't want to ping the user about every
      // unread message they already had in the queue when they opened the app
      if (!firstLoadRef.current && arrivals.length > 0) {
        beep();
        // only desktop-notify the most recent one to avoid stacking
        const newest = arrivals[arrivals.length - 1];
        showDesktopNotification(newest.snippet, newest.threadId);
        // also flicker the tab title so it's visible even with sound off
        flashTitle(arrivals.length);
      }
      seenIdsRef.current = nextKeys;
      firstLoadRef.current = false;
    } catch {
      // network blip, leave the bell as-is
    }
  }

  // tab title flicker so users notice even when audio is muted
  const baseTitleRef = useRef<string | null>(null);
  const titleTimerRef = useRef<number | null>(null);
  function flashTitle(count: number) {
    if (typeof document === "undefined") return;
    if (!document.hidden) return;
    baseTitleRef.current ??= document.title;
    let on = true;
    if (titleTimerRef.current) window.clearInterval(titleTimerRef.current);
    titleTimerRef.current = window.setInterval(() => {
      document.title = on
        ? `(${count}) New message · TutorLink`
        : (baseTitleRef.current ?? "TutorLink");
      on = !on;
    }, 1000);
    const restore = () => {
      if (titleTimerRef.current) window.clearInterval(titleTimerRef.current);
      titleTimerRef.current = null;
      if (baseTitleRef.current) document.title = baseTitleRef.current;
      document.removeEventListener("visibilitychange", restore);
      window.removeEventListener("focus", restore);
    };
    document.addEventListener("visibilitychange", restore);
    window.addEventListener("focus", restore);
  }

  useEffect(() => {
    cancelledRef.current = false;
    void load();
    let timer: number | null = null;
    function schedule() {
      const ms =
        typeof document !== "undefined" && document.hidden
          ? POLL_HIDDEN_MS
          : POLL_ACTIVE_MS;
      timer = window.setTimeout(async () => {
        await load();
        if (!cancelledRef.current) schedule();
      }, ms);
    }
    schedule();
    function onVis() {
      if (timer) window.clearTimeout(timer);
      void load();
      schedule();
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      cancelledRef.current = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
    } catch {
      // safari throws on legacy callbacks; nothing to do
    }
  }

  async function markRead(threadId: string) {
    setData((prev) => {
      const remaining = prev.recent.filter((r) => r.threadId !== threadId);
      const dropped = prev.recent.length - remaining.length;
      return {
        unreadCount: Math.max(0, prev.unreadCount - dropped),
        recent: remaining,
      };
    });
    try {
      await fetch(`/api/threads/${threadId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // server will reconcile on the next poll
    }
  }

  async function markAllVisibleRead() {
    const ids = data.recent.map((r) => r.threadId);
    if (ids.length === 0) return;
    setData({ unreadCount: 0, recent: [] });
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/threads/${id}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => null),
      ),
    );
  }

  const count = data.unreadCount;
  const showBadge = count > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          showBadge ? `${count} new conversation${count === 1 ? "" : "s"}` : "Notifications"
        }
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {showBadge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-slate-950">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <div className="flex items-center gap-3">
              {data.recent.length > 0 ? (
                <button
                  type="button"
                  onClick={markAllVisibleRead}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Mark all read
                </button>
              ) : null}
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="text-xs text-cyan-200 hover:underline"
              >
                View all
              </Link>
            </div>
          </div>

          {permission === "default" ? (
            <button
              type="button"
              onClick={requestPermission}
              className="flex w-full items-center justify-between gap-3 border-b border-white/10 bg-cyan-300/5 px-4 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-300/10"
            >
              <span>Turn on desktop alerts so you don&apos;t miss messages.</span>
              <span className="rounded-md border border-cyan-300/30 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                Enable
              </span>
            </button>
          ) : permission === "denied" ? (
            <p className="border-b border-white/10 bg-rose-400/5 px-4 py-2 text-[11px] text-rose-200">
              Desktop notifications are blocked. Enable them from your
              browser&apos;s site settings to get pinged for new messages.
            </p>
          ) : null}

          {data.recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {data.recent.map((item) => (
                <li key={item.threadId}>
                  <Link
                    href={`/messages/${item.threadId}`}
                    onClick={() => {
                      setOpen(false);
                      void markRead(item.threadId);
                    }}
                    className="block px-4 py-3 text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    <p className="line-clamp-2 text-sm text-white">{item.snippet || "(no preview)"}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

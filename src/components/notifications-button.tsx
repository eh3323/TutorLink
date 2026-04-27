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

export function NotificationsButton() {
  const [data, setData] = useState<Payload>({ unreadCount: 0, recent: [] });
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelledRef.current && json.ok) setData(json.data);
    } catch {
      // network blip, leave the bell as-is
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const t = window.setInterval(load, 60000);
    return () => {
      cancelledRef.current = true;
      window.clearInterval(t);
    };
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

  // mark a single thread as read on the server, and optimistically drop it
  // from the dropdown so the badge can clear without waiting for a full poll
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

  // mark every thread visible in the dropdown as read in one go
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

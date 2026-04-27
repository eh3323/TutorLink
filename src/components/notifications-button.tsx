"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.ok) setData(json.data);
      } catch {
        /* swallow network errors; the bell just stays empty */
      }
    }
    load();
    const t = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
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
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="text-xs text-cyan-200 hover:underline"
            >
              View all
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              You're all caught up.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {data.recent.map((item) => (
                <li key={item.threadId}>
                  <Link
                    href={`/messages/${item.threadId}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    <p className="line-clamp-2 text-sm text-white">{item.snippet || "(no preview)"}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
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

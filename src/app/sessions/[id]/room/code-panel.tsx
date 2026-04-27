"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";

const LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
  "c",
  "go",
  "rust",
  "ruby",
  "swift",
  "kotlin",
  "sql",
  "json",
  "markdown",
  "html",
  "css",
  "shell",
  "plaintext",
] as const;

type Props = {
  sessionId: string;
  // displayed in the status pill
  displayName: string;
};

// transport tag used to skip echoing local updates back into the network
const ORIGIN_REMOTE = Symbol("yjs-server-remote");

function toBase64(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return typeof window === "undefined"
    ? Buffer.from(bytes).toString("base64")
    : window.btoa(str);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function CodePanel({ sessionId, displayName }: Props) {
  const [language, setLanguage] = useState<string>("python");
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );
  const [pending, setPending] = useState(0);

  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const cursorRef = useRef<string | null>(null);
  const queueRef = useRef<Uint8Array[]>([]);
  const flushingRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // ---------- bootstrap a y.doc + bind to the server relay ----------
  useEffect(() => {
    mountedRef.current = true;
    const doc = new Y.Doc();
    ydocRef.current = doc;

    const onUpdate = (update: Uint8Array, origin: unknown) => {
      // skip updates we just applied from the server, otherwise we'd loop
      if (origin === ORIGIN_REMOTE) return;
      queueRef.current.push(update);
      setPending((n) => n + 1);
      scheduleFlush();
    };
    doc.on("update", onUpdate);

    void initialPullAndPoll();

    return () => {
      mountedRef.current = false;
      doc.off("update", onUpdate);
      try {
        bindingRef.current?.destroy();
      } catch {
        // already torn down
      }
      bindingRef.current = null;
      doc.destroy();
      ydocRef.current = null;
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      queueRef.current = [];
    };
    // intentional: only re-initialise when the room changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ---------- helpers ----------
  function scheduleFlush() {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, 250);
  }

  async function flush() {
    if (flushingRef.current) return;
    const doc = ydocRef.current;
    if (!doc) return;
    if (queueRef.current.length === 0) return;
    flushingRef.current = true;
    // merge pending local updates into one payload before sending
    const merged = Y.mergeUpdates(queueRef.current.splice(0));
    setPending(0);
    try {
      // post as base64 json; binary BodyInit typing in TS is currently
      // mismatched with Uint8Array generics, and base64 keeps the route
      // simple to reason about
      const res = await fetch(`/api/sessions/${sessionId}/yjs/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: toBase64(merged) }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      if (mountedRef.current) setStatus("live");
    } catch {
      // requeue so we try again on next interval
      queueRef.current.unshift(merged);
      setPending(queueRef.current.length);
      if (mountedRef.current) setStatus("offline");
    } finally {
      flushingRef.current = false;
    }
  }

  async function pullOnce() {
    const doc = ydocRef.current;
    if (!doc) return;
    try {
      const url = new URL(
        `/api/sessions/${sessionId}/yjs/code`,
        window.location.origin,
      );
      if (cursorRef.current) url.searchParams.set("after", cursorRef.current);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (!json?.ok) return;
      const items = json.data?.items ?? [];
      if (items.length > 0) {
        Y.transact(
          doc,
          () => {
            for (const item of items as Array<{ payload: string }>) {
              try {
                Y.applyUpdate(doc, fromBase64(item.payload), ORIGIN_REMOTE);
              } catch {
                // single bad chunk shouldn't kill the whole pull
              }
            }
          },
          ORIGIN_REMOTE,
        );
        cursorRef.current = items[items.length - 1].createdAt;
      } else if (json.data?.nextAfter) {
        cursorRef.current = json.data.nextAfter;
      }
      if (mountedRef.current) setStatus("live");
    } catch {
      if (mountedRef.current) setStatus("offline");
    }
  }

  async function initialPullAndPoll() {
    await pullOnce();
    if (!mountedRef.current) return;
    // tighter loop while focused; back off when document hidden
    const tick = async () => {
      if (!mountedRef.current) return;
      const interval = document.hidden ? 4000 : 1200;
      await pullOnce();
      // also flush in case timer-based flush missed a window
      if (queueRef.current.length > 0 && !flushingRef.current) {
        void flush();
      }
      if (!mountedRef.current) return;
      pollTimerRef.current = window.setTimeout(tick, interval);
    };
    pollTimerRef.current = window.setTimeout(tick, 1200);
  }

  // ---------- monaco mount ----------
  const handleMount: OnMount = useCallback((editor) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const ytext = ydoc.getText("monaco");
    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      // no awareness provider for now; we trade remote cursors for reliability
      null,
    );
  }, []);

  const statusLabel =
    status === "live"
      ? "Live · synced"
      : status === "connecting"
        ? "Connecting…"
        : pending > 0
          ? `Reconnecting (${pending} pending)`
          : "Offline";
  const statusColor =
    status === "live"
      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
      : status === "connecting"
        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
        : "border-amber-300/40 bg-amber-300/10 text-amber-100";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 bg-slate-950/60 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Live code · {displayName}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
        >
          {statusLabel}
        </span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto rounded-md border border-white/10 bg-slate-950/80 px-2 py-1 text-xs text-white"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          defaultValue="# write code together — both sides see edits live\n"
          onMount={handleMount}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

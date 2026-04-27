"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
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

const SIGNALING_DEFAULT = ["wss://signaling.yjs.dev", "wss://y-webrtc-signaling-eu.herokuapp.com"];

type Props = {
  // unique room name shared by both participants so y-webrtc finds peers
  collabRoom: string;
  // displayed in remote-cursor labels
  displayName: string;
};

export default function CodePanel({ collabRoom, displayName }: Props) {
  const [language, setLanguage] = useState<string>("python");
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    ydocRef.current = doc;
    const signaling =
      (process.env.NEXT_PUBLIC_YJS_SIGNALING ?? SIGNALING_DEFAULT.join(","))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const provider = new WebrtcProvider(collabRoom, doc, {
      signaling,
    });
    provider.awareness.setLocalStateField("user", {
      name: displayName,
      color: pickColor(displayName),
    });
    providerRef.current = provider;

    return () => {
      try {
        bindingRef.current?.destroy();
      } catch {
        // binding may already be torn down
      }
      providerRef.current?.destroy();
      doc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      bindingRef.current = null;
    };
    // intentional: collabRoom is the only thing that should restart sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabRoom]);

  const handleMount: OnMount = useCallback((editor) => {
    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    if (!ydoc || !provider) return;
    const ytext = ydoc.getText("monaco");
    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      provider.awareness,
    );
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 bg-slate-950/60 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Live code · P2P
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

function pickColor(seed: string) {
  // deterministic color per display name so each peer keeps the same cursor
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

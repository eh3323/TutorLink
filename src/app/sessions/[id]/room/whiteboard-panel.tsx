"use client";

import { Tldraw, type Editor } from "tldraw";
import { useSyncDemo } from "@tldraw/sync";

// useSyncDemo wires the whiteboard to tldraw's hosted sync server. both sides
// of the same session join the same roomId (we pass the per-session roomToken)
// so they see each other's strokes in real time. it's the official "demo"
// server but it's been stable for our scale; can swap for self-hosted useSync
// later without touching the ui.
//
// note: tldraw.css is imported globally in src/app/layout.tsx so it's bundled
// eagerly. importing it inside this dynamically-loaded chunk used to race the
// first paint and made the canvas look completely black (it was rendering
// without theme variables, so the parent's bg-black showed through).
export default function WhiteboardPanel({ roomId }: { roomId: string }) {
  const store = useSyncDemo({ roomId });

  // the page itself uses color-scheme: dark and a near-black body bg, but the
  // whiteboard reads better in light mode (white canvas + colored strokes).
  // forcing light mode also avoids tldraw inheriting the page's dark theme,
  // which was the root cause of the all-black panel report.
  function handleMount(editor: Editor) {
    editor.user.updateUserPreferences({ colorScheme: "light" });
  }

  return (
    <div className="h-full w-full bg-white">
      <Tldraw store={store} onMount={handleMount} />
    </div>
  );
}

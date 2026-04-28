"use client";

import { Tldraw, type Editor } from "tldraw";
import { useSyncDemo } from "@tldraw/sync";

// uses tldraw's hosted demo sync server. both sides join via the per-session
// roomToken so strokes propagate live. swap to self-hosted useSync later
// without touching the ui.
//
// tldraw.css is imported globally in layout.tsx (eager) so the canvas always
// has its theme variables; importing it here would race the dynamic chunk.
export default function WhiteboardPanel({ roomId }: { roomId: string }) {
  const store = useSyncDemo({ roomId });

  // pin to light mode — page is dark but the whiteboard is much more readable
  // with a white canvas, and it stops tldraw from inheriting the page's
  // color-scheme (which lands on a near-black bg).
  function handleMount(editor: Editor) {
    editor.user.updateUserPreferences({ colorScheme: "light" });
  }

  return (
    <div className="h-full w-full bg-white">
      <Tldraw store={store} onMount={handleMount} />
    </div>
  );
}

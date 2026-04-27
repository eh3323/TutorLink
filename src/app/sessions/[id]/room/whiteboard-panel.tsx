"use client";

import { Tldraw } from "tldraw";
import { useSyncDemo } from "@tldraw/sync";
import "tldraw/tldraw.css";

// useSyncDemo wires the whiteboard to tldraw's hosted sync server. both sides
// of the same session join the same roomId (we pass the per-session roomToken)
// so they see each other's strokes in real time. it's the official "demo"
// server but it's been stable for our scale; can swap for self-hosted useSync
// later without touching the ui.
export default function WhiteboardPanel({ roomId }: { roomId: string }) {
  const store = useSyncDemo({ roomId });
  return (
    <div className="h-full w-full">
      <Tldraw store={store} />
    </div>
  );
}

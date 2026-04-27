"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// tldraw's persistenceKey scopes the local store. using the room token gives
// each session its own private board that survives refresh on the same device.
// real multi-user sync would need a sync server; for now both sides see the
// same drawing via livekit screenshare or by sending tldraw snapshots over
// the chat thread.
export default function WhiteboardPanel({
  persistenceKey,
}: {
  persistenceKey: string;
}) {
  return (
    <div className="h-full w-full">
      <Tldraw persistenceKey={persistenceKey} />
    </div>
  );
}

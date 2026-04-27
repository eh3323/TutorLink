"use client";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";

type TokenPayload = {
  token: string;
  url: string;
  roomName: string;
};

function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

export default function LiveKitPanel({
  sessionId,
  onUnavailable,
}: {
  sessionId: string;
  onUnavailable: (reason: string) => void;
}) {
  const [token, setToken] = useState<TokenPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchToken() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/livekit-token`, {
          method: "POST",
        });
        const payload = await res.json();
        if (!res.ok || !payload.ok) {
          const reason =
            payload?.error?.message ?? "LiveKit unavailable for this session.";
          if (!cancelled) {
            setError(reason);
            onUnavailable(reason);
          }
          return;
        }
        if (!cancelled) {
          setToken({
            token: payload.data.token,
            url: payload.data.url,
            roomName: payload.data.roomName,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const reason = err instanceof Error ? err.message : "Network error.";
          setError(reason);
          onUnavailable(reason);
        }
      }
    }
    void fetchToken();
    return () => {
      cancelled = true;
    };
  }, [sessionId, onUnavailable]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
        {error}
      </div>
    );
  }
  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-sm text-slate-300">
        Connecting to private room…
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token.token}
      serverUrl={token.url}
      connect={true}
      audio={true}
      video={true}
      data-lk-theme="default"
      style={{ height: "100%" }}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1">
          <VideoStage />
        </div>
        <RoomAudioRenderer />
        <ControlBar variation="minimal" />
      </div>
    </LiveKitRoom>
  );
}

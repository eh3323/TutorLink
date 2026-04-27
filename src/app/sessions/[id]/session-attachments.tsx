"use client";

import { useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";

type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string | Date;
  uploader: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  uploaderIsMe: boolean;
  canDelete: boolean;
};

type Props = {
  sessionId: string;
  initial: Attachment[];
  canUpload: boolean;
};

const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionAttachments({ sessionId, initial, canUpload }: Props) {
  const [items, setItems] = useState<Attachment[]>(initial);
  const [busy, setBusy] = useState(false);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(file: File) {
    if (file.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be 25 MB or smaller.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/sessions/${sessionId}/attachments`, {
        method: "POST",
        body: form,
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Upload failed.");
      } else {
        setItems((prev) => [...prev, payload.data.attachment as Attachment]);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setBusyDelete(id);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attachments/${id}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not remove file.");
      } else {
        setItems((prev) => prev.filter((it) => it.id !== id));
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyDelete(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Shared materials
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Available for online sessions. Max 25 MB per file. PDFs, Office docs,
            images, txt/csv/md, and zip.
          </p>
        </div>
        {canUpload ? (
          <label
            className={`inline-flex h-9 cursor-pointer items-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20 ${
              busy ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {busy ? "Uploading…" : "Upload file"}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </label>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-400">
          {canUpload
            ? "No files yet. Drop notes, slides, or practice problems here."
            : "Nothing shared yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={item.uploader.fullName}
                  src={item.uploader.avatarUrl ?? null}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {item.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.uploaderIsMe ? "You" : item.uploader.fullName}
                    {" · "}
                    {formatBytes(item.sizeBytes)}
                    {" · "}
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/sessions/${sessionId}/attachments/${item.id}/file`}
                  className="inline-flex h-8 items-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-100 hover:bg-white/10"
                >
                  Download
                </a>
                {item.canDelete ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busyDelete === item.id}
                    className="inline-flex h-8 items-center rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 text-xs font-medium text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
                  >
                    {busyDelete === item.id ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

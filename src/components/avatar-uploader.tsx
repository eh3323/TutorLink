"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/avatar";

type Props = {
  fullName: string | null | undefined;
  initialAvatarUrl: string | null;
};

export function AvatarUploader({ fullName, initialAvatarUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<null | "upload" | "remove">(null);

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be 2 MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setError("Use a PNG, JPEG, WEBP, or GIF image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setIsBusy("upload");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? `Upload failed (${response.status}).`);
      } else {
        setAvatarUrl(payload.data.avatarUrl);
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!avatarUrl) return;
    setError(null);
    setIsBusy("remove");
    try {
      const response = await fetch("/api/avatar", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Could not remove avatar.");
      } else {
        setAvatarUrl(null);
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center">
      <Avatar name={fullName} src={avatarUrl} size="xl" />
      <div className="flex-1 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Profile photo</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload a PNG, JPEG, WEBP, or GIF under 2 MB. A good avatar makes people
            way more likely to message you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isBusy !== null}
            className="inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy === "upload"
              ? "Uploading…"
              : avatarUrl
                ? "Replace photo"
                : "Upload a photo"}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy !== null}
              className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
            >
              {isBusy === "remove" ? "Removing…" : "Remove"}
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleSelect}
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

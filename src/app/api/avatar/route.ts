import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    const multipartHeader = request.headers.get("content-type") ?? "";
    if (!multipartHeader.toLowerCase().includes("multipart/form-data")) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Expected multipart/form-data with an 'avatar' file.",
      );
    }

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      throw new ApiError(400, "INVALID_INPUT", "Missing 'avatar' file in form data.");
    }

    if (file.size === 0) {
      throw new ApiError(400, "INVALID_INPUT", "Uploaded file is empty.");
    }

    if (file.size > MAX_BYTES) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Avatar must be 2 MB or smaller.",
      );
    }

    const mime = file.type.toLowerCase();
    const extension = ALLOWED_MIME[mime];
    if (!extension) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Avatar must be PNG, JPEG, WEBP, or GIF.",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${sessionUser.id}-${Date.now()}-${randomBytes(4).toString("hex")}${extension}`;
    const imageContentType = mime === "image/jpg" ? "image/jpeg" : mime;

    let avatarUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`avatars/${filename}`, bytes, {
        access: "public",
        contentType: imageContentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      avatarUrl = blob.url;
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new ApiError(
          503,
          "AVATAR_STORAGE",
          "Avatar uploads require BLOB_READ_WRITE_TOKEN in production.",
        );
      }
      const dir = path.join(process.cwd(), "public", "avatars");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), bytes);
      avatarUrl = `/avatars/${filename}`;
    }

    await db.profile.upsert({
      where: { userId: sessionUser.id },
      update: { avatarUrl },
      create: {
        userId: sessionUser.id,
        fullName: sessionUser.name ?? sessionUser.email ?? "New user",
        avatarUrl,
      },
    });

    return apiOk({ avatarUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  try {
    const sessionUser = await requireSessionUser();
    const profile = await db.profile.findUnique({
      where: { userId: sessionUser.id },
      select: { avatarUrl: true },
    });
    const prev = profile?.avatarUrl;
    if (
      prev &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      (prev.includes(".public.blob.vercel-storage.com") ||
        prev.includes(".blob.vercel-storage.com"))
    ) {
      try {
        await del(prev, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch {
        /* ignore storage delete errors; still clear profile */
      }
    }
    await db.profile.update({
      where: { userId: sessionUser.id },
      data: { avatarUrl: null },
    });
    return apiOk({ avatarUrl: null });
  } catch (error) {
    return handleRouteError(error);
  }
}

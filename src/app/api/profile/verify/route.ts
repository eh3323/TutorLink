import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { VerificationStatus } from "@/lib/enums";
import { requireSessionUser } from "@/lib/permissions";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_DOC_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    const profile = await db.profile.findUnique({
      where: { userId: sessionUser.id },
      select: { fullName: true },
    });
    if (!profile || !profile.fullName?.trim()) {
      throw new ApiError(
        400,
        "PROFILE_INCOMPLETE",
        "Add your full name in the profile before requesting verification.",
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Verification submissions require an uploaded document. Send multipart/form-data with a 'document' file.",
      );
    }

    const formData = await request.formData();
    const file = formData.get("document");
    const noteRaw = formData.get("note");

    if (!(file instanceof File)) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Attach a PDF, Word document, or image so an admin can review your account.",
      );
    }

    if (file.size === 0) {
      throw new ApiError(400, "INVALID_INPUT", "Uploaded document is empty.");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Document must be 8 MB or smaller.",
      );
    }

    const mime = (file.type || "").toLowerCase();
    const extension = ALLOWED_DOC_MIME[mime];
    if (!extension) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Use PDF, DOC, DOCX, PNG, JPEG, or WEBP for your verification document.",
      );
    }

    const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 600) : "";
    const originalName = sanitizeFilename(file.name || `document${extension}`);
    const storedName = `${sessionUser.id}-${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
    const stored = mime === "image/jpg" ? "image/jpeg" : mime;
    const bytes = Buffer.from(await file.arrayBuffer());

    const previous = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { verificationDocumentUrl: true, verificationStatus: true },
    });

    if (previous?.verificationStatus === VerificationStatus.VERIFIED) {
      return apiOk({
        verificationStatus: VerificationStatus.VERIFIED,
        verificationNote: null,
        verificationDocumentUrl: previous.verificationDocumentUrl ?? null,
      });
    }

    let documentUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`verifications/${storedName}`, bytes, {
        access: "public",
        contentType: stored,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      documentUrl = blob.url;
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new ApiError(
          503,
          "VERIFICATION_STORAGE",
          "Verification uploads require BLOB_READ_WRITE_TOKEN in production.",
        );
      }
      const dir = path.join(process.cwd(), "public", "verifications");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, storedName), bytes);
      documentUrl = `/verifications/${storedName}`;
    }

    if (
      previous?.verificationDocumentUrl &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      (previous.verificationDocumentUrl.includes(".public.blob.vercel-storage.com") ||
        previous.verificationDocumentUrl.includes(".blob.vercel-storage.com"))
    ) {
      try {
        await del(previous.verificationDocumentUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch {
        /* ignore prior delete errors */
      }
    }

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        verificationNote: note || null,
        verificationSubmittedAt: new Date(),
        verificationDocumentUrl: documentUrl,
        verificationDocumentName: originalName,
        verificationDocumentType: stored,
        verificationDocumentSize: file.size,
      },
      select: {
        verificationStatus: true,
        verificationNote: true,
        verificationSubmittedAt: true,
        verificationDocumentUrl: true,
        verificationDocumentName: true,
        verificationDocumentType: true,
        verificationDocumentSize: true,
      },
    });

    return apiOk(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

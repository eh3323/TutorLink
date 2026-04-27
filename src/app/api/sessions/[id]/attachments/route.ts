import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import {
  SESSION_ATTACHMENT_ALLOWED,
  SESSION_ATTACHMENT_MAX_BYTES,
  addSessionAttachment,
  listSessionAttachments,
} from "@/lib/sessions";

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "file";
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;
    const attachments = await listSessionAttachments(sessionUser, id);
    return apiOk({ attachments });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id: sessionId } = await context.params;

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Send multipart/form-data with a 'file' field.",
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "INVALID_INPUT", "Missing 'file' in form data.");
    }
    if (file.size === 0) {
      throw new ApiError(400, "INVALID_INPUT", "Uploaded file is empty.");
    }
    if (file.size > SESSION_ATTACHMENT_MAX_BYTES) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "File must be 25 MB or smaller.",
      );
    }

    const mime = (file.type || "").toLowerCase();
    const extension = SESSION_ATTACHMENT_ALLOWED[mime];
    if (!extension) {
      throw new ApiError(
        400,
        "INVALID_INPUT",
        "Unsupported file type. Try PDF, Office docs, images, txt/csv/md, or zip.",
      );
    }

    const stored = mime === "image/jpg" ? "image/jpeg" : mime;
    const originalName = sanitizeFilename(file.name || `file${extension}`);
    const blobName = `${sessionId}-${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`session-attachments/${blobName}`, bytes, {
        access: "public",
        contentType: stored,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      url = blob.url;
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new ApiError(
          503,
          "ATTACHMENT_STORAGE",
          "Session uploads require BLOB_READ_WRITE_TOKEN in production.",
        );
      }
      const dir = path.join(process.cwd(), "public", "session-attachments");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, blobName), bytes);
      url = `/session-attachments/${blobName}`;
    }

    const created = await addSessionAttachment(sessionUser, sessionId, {
      name: originalName,
      mimeType: stored,
      sizeBytes: file.size,
      url,
    });

    return apiOk({ attachment: created });
  } catch (error) {
    return handleRouteError(error);
  }
}

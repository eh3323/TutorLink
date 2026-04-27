import { del } from "@vercel/blob";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { apiOk, handleRouteError } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { removeSessionAttachment } from "@/lib/sessions";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id: sessionId, attachmentId } = await context.params;
    const removed = await removeSessionAttachment(sessionUser, sessionId, attachmentId);

    if (
      removed.url &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      (removed.url.includes(".public.blob.vercel-storage.com") ||
        removed.url.includes(".blob.vercel-storage.com"))
    ) {
      try {
        await del(removed.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch {
        // blob delete can fail; the row is already gone so just move on
      }
    } else if (removed.url && removed.url.startsWith("/session-attachments/")) {
      // local dev fallback storage
      try {
        await unlink(path.join(process.cwd(), "public", removed.url));
      } catch {
        // local file might already be gone
      }
    }

    return apiOk({ id: removed.id });
  } catch (error) {
    return handleRouteError(error);
  }
}

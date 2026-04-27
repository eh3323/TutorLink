import { ApiError, handleRouteError } from "@/lib/api";
import { requireSessionUser } from "@/lib/permissions";
import { getSessionAttachmentForDownload } from "@/lib/sessions";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id: sessionId, attachmentId } = await context.params;
    const attachment = await getSessionAttachmentForDownload(
      sessionUser,
      sessionId,
      attachmentId,
    );

    const upstream = await fetch(attachment.url);
    if (!upstream.ok || !upstream.body) {
      throw new ApiError(502, "STORAGE_ERROR", "Could not load the file.");
    }

    const safeName = (attachment.name || "file").replace(/["\\\r\n]/g, "_");
    const headers = new Headers();
    headers.set("content-type", attachment.mimeType || "application/octet-stream");
    headers.set("content-disposition", `attachment; filename="${safeName}"`);
    const length = upstream.headers.get("content-length");
    if (length) headers.set("content-length", length);
    headers.set("cache-control", "private, max-age=0, no-store");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return handleRouteError(error);
  }
}

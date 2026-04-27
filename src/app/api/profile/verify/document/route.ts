import { ApiError, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        verificationDocumentUrl: true,
        verificationDocumentName: true,
        verificationDocumentType: true,
      },
    });
    if (!user || !user.verificationDocumentUrl) {
      throw new ApiError(404, "NOT_FOUND", "You haven't uploaded a document yet.");
    }
    const upstream = await fetch(user.verificationDocumentUrl);
    if (!upstream.ok || !upstream.body) {
      throw new ApiError(502, "STORAGE_ERROR", "Could not load the document.");
    }
    const safeName = (user.verificationDocumentName ?? "verification").replace(
      /["\\\r\n]/g,
      "_",
    );
    const headers = new Headers();
    headers.set(
      "content-type",
      user.verificationDocumentType ?? "application/octet-stream",
    );
    headers.set(
      "content-disposition",
      `attachment; filename="${safeName}"`,
    );
    const length = upstream.headers.get("content-length");
    if (length) headers.set("content-length", length);
    headers.set("cache-control", "private, max-age=0, no-store");
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return handleRouteError(error);
  }
}

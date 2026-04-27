import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/messages",
  "/sessions",
  "/admin",
  "/requests/new",
];

const ADMIN_PREFIXES = ["/admin", "/api/admin"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAdminPath(pathname: string) {
  return ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAdmin = isAdminPath(pathname);
  const needsAuth = needsAdmin || isProtectedPath(pathname);

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.id) {
    const isApi = pathname.startsWith("/api/");
    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "You must be signed in." },
        },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/signin", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (needsAdmin && !token.isAdmin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "FORBIDDEN", message: "Admin access required." },
        },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/sessions/:path*",
    "/admin/:path*",
    "/requests/new",
    "/api/admin/:path*",
  ],
};

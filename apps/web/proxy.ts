import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pulsenote_session";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isAssetRequest =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname);
  const isLoginRoute = pathname === "/login";
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isAssetRequest) {
    return NextResponse.next();
  }

  if (!session && !isLoginRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/:path*"],
};

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  let authenticated = false;
  if (accessToken && (await verifyAccessToken(accessToken))) {
    authenticated = true;
  } else if (refreshToken && (await verifyRefreshToken(refreshToken))) {
    // Access token expired but refresh token is valid; the client's next call
    // to /api/auth/me will silently reissue a fresh access token.
    authenticated = true;
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

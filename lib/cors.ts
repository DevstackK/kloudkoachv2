import { NextRequest, NextResponse } from "next/server";

/**
 * These routes are called cross-origin from the Chrome extension
 * (chrome-extension://<id>) using Authorization: Bearer <deviceToken>
 * rather than cookies, so CORS is the right trust boundary here, not a
 * hole in it - a request still needs a valid device token to do anything.
 * The extension ID varies per install (dev vs. eventually published), so
 * we allow any chrome-extension:// origin rather than hardcoding one.
 */
function isAllowedExtensionOrigin(origin: string | null): boolean {
  return !!origin && origin.startsWith("chrome-extension://");
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!isAllowedExtensionOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const headers = corsHeaders(req);
  for (const [key, value] of Object.entries(headers)) res.headers.set(key, value);
  return res;
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

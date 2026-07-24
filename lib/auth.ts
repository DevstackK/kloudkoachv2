import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

function getSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return new TextEncoder().encode(value);
}

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
};

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret("JWT_SECRET"));
}

export async function signRefreshToken(payload: AccessTokenPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecret("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("JWT_SECRET"));
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email as string };
  } catch {
    return null;
  }
}

const COMPANION_TOKEN_TTL = "30m";

/**
 * Short-lived pairing token for the QR-code phone companion view. Scoped to
 * a single CoachingSession, not a user account - the phone never logs in,
 * the token itself is the whole credential (WhatsApp-Web-style pairing).
 * Encoded as a JWT so no extra DB table/migration is needed for pairing.
 */
export async function signCompanionToken(sessionId: string) {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(COMPANION_TOKEN_TTL)
    .sign(getSecret("JWT_SECRET"));
}

export async function verifyCompanionToken(token: string): Promise<{ sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("JWT_SECRET"));
    if (!payload.sessionId || typeof payload.sessionId !== "string") return null;
    return { sessionId: payload.sessionId };
  } catch {
    return null;
  }
}

export const ACCESS_COOKIE_NAME = "kk_access";
export const REFRESH_COOKIE_NAME = "kk_refresh";

// NODE_ENV === "production" does NOT mean HTTPS is actually available (e.g.
// a bare-IP VPS deployment with no domain/TLS yet is still "production").
// Browsers silently drop cookies marked Secure when set over plain HTTP, so
// basing this on NODE_ENV alone breaks login on exactly that setup. Derive
// it from whether the app's own configured URL is actually https instead.
const isHttps = (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");

export const accessCookieOptions = {
  httpOnly: true,
  secure: isHttps,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 15, // 15 minutes
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isHttps,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

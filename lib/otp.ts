import { randomInt, createHash } from "node:crypto";

export const OTP_TTL_MS = 10 * 60_000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

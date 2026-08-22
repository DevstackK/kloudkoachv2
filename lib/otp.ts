import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const OTP_TTL_MS = 10 * 60_000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Generates a fresh code, stores it (resetting the attempt counter), and emails it. */
export async function issueOtp(userId: string, email: string, name: string): Promise<void> {
  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { otpCode, otpExpiresAt, otpAttempts: 0 },
  });

  await sendEmail({
    to: email,
    subject: `${otpCode} is your Kloud Koach verification code`,
    text: `Hi ${name},\n\nYour verification code is ${otpCode}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${otpCode}</p><p>It expires in 10 minutes.</p><p>If you didn't request this, you can ignore this email.</p>`,
  });
}

export type OtpVerifyResult = { ok: true } | { ok: false; message: string };

/** Checks a submitted code against the stored one, enforcing expiry and a capped attempt count. */
export async function verifyOtp(userId: string, submittedCode: string): Promise<OtpVerifyResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, message: "Account not found." };
  if (user.emailVerified) return { ok: true };

  if (!user.otpCode || !user.otpExpiresAt) {
    return { ok: false, message: "No verification code is pending. Request a new one." };
  }
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts. Request a new code." };
  }
  if (user.otpExpiresAt < new Date()) {
    return { ok: false, message: "That code has expired. Request a new one." };
  }

  if (submittedCode !== user.otpCode) {
    await prisma.user.update({ where: { id: userId }, data: { otpAttempts: { increment: 1 } } });
    const remaining = MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
    return {
      ok: false,
      message: remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, otpCode: null, otpExpiresAt: null, otpAttempts: 0 },
  });
  return { ok: true };
}

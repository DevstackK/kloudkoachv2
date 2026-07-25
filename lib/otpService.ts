import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { sendEmail, otpEmailHtml } from "@/lib/email";

export type OtpPurpose = "verify_email" | "reset_password";

export async function issueOtp(userId: string, email: string, purpose: OtpPurpose) {
  const code = generateOtp();
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpCodeHash: hashOtp(code),
      otpPurpose: purpose,
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    },
  });

  await sendEmail({
    to: email,
    subject: purpose === "verify_email" ? "Verify your Kloud Koach email" : "Your Kloud Koach password reset code",
    html: otpEmailHtml(code, purpose),
  });
}

export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { otpCodeHash: true, otpPurpose: true, otpExpiresAt: true, otpAttempts: true },
  });

  if (!user || !user.otpCodeHash || user.otpPurpose !== purpose || !user.otpExpiresAt) {
    return { ok: false, message: "No pending code. Please request a new one." };
  }
  if (user.otpExpiresAt < new Date()) {
    return { ok: false, message: "This code has expired. Please request a new one." };
  }
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts. Please request a new code." };
  }
  if (hashOtp(code) !== user.otpCodeHash) {
    await prisma.user.update({ where: { id: userId }, data: { otpAttempts: { increment: 1 } } });
    return { ok: false, message: "Incorrect code." };
  }

  // Clear the OTP now that it's been used - single use, like the token it replaced.
  await prisma.user.update({
    where: { id: userId },
    data: { otpCodeHash: null, otpPurpose: null, otpExpiresAt: null, otpAttempts: 0 },
  });

  return { ok: true };
}

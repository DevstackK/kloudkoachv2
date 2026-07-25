import { redirect } from "next/navigation";

// Password reset moved to a single-page OTP flow at /forgot-password
// (email -> code + new password) instead of a token link.
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}

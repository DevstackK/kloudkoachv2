const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !from) {
    // Mirrors the pre-existing forgot-password TODO: no provider configured
    // yet, so log instead of silently dropping the email in local dev.
    console.log(`[dev] Email to ${to} (SENDGRID_API_KEY/SENDGRID_FROM_EMAIL not set):\nSubject: ${subject}\n${html}`);
    return;
  }

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: "Kloud Koach" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SendGrid send failed (${res.status}): ${text}`);
  }
}

export function otpEmailHtml(code: string, purpose: "verify_email" | "reset_password") {
  const heading = purpose === "verify_email" ? "Verify your email" : "Reset your password";
  const body =
    purpose === "verify_email"
      ? "Use this code to verify your email address:"
      : "Use this code to reset your password:";

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>${heading}</h2>
      <p>${body}</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
      <p style="color:#666">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

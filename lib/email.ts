const SMTP2GO_API_URL = "https://api.smtp2go.com/v3/email/send";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const sender = process.env.SMTP2GO_SENDER_EMAIL;

  if (!apiKey || !sender) {
    // Mirrors the pre-existing forgot-password TODO: no provider configured
    // yet, so log instead of silently dropping the email in local dev.
    console.log(`[dev] Email to ${to} (SMTP2GO_API_KEY/SMTP2GO_SENDER_EMAIL not set):\nSubject: ${subject}\n${html}`);
    return;
  }

  const res = await fetch(SMTP2GO_API_URL, {
    method: "POST",
    headers: { "X-Smtp2go-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: `Kloud Koach <${sender}>`,
      to: [to],
      subject,
      html_body: html,
    }),
  });

  const json = await res.json().catch(() => null);
  // SMTP2GO returns 200 even for some rejected requests - the real result
  // is in data.succeeded/failed, so check that rather than trust res.ok alone.
  if (!res.ok || !json?.data || json.data.succeeded !== 1) {
    throw new Error(`SMTP2GO send failed (${res.status}): ${JSON.stringify(json)}`);
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

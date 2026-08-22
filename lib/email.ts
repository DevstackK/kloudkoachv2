const SMTP2GO_SEND_URL = "https://api.smtp2go.com/v3/email/send";

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends via SMTP2GO's REST API. Falls back to a console log when the key
 * isn't configured, matching the rest of the app's "missing optional key ->
 * degrade gracefully" pattern (see README) rather than blocking local dev.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const sender = process.env.SMTP2GO_SENDER_EMAIL;

  if (!apiKey || !sender) {
    console.log(`[dev] Email to ${to}: ${subject}\n${text}`);
    return;
  }

  const res = await fetch(SMTP2GO_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Smtp2go-Api-Key": apiKey },
    body: JSON.stringify({ sender, to: [to], subject, text_body: text, html_body: html }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data || json.data.succeeded < 1 || json.data.failed > 0) {
    throw new Error(`SMTP2GO send failed: ${JSON.stringify(json)}`);
  }
}

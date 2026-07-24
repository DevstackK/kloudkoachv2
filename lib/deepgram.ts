/**
 * Returns the Deepgram key the browser/extension uses to open a streaming
 * transcription WebSocket directly (no audio proxied through our server).
 *
 * SECURITY NOTE - deliberate tradeoff, not an oversight: this was designed
 * to mint a short-lived, scoped temporary key per session (via Deepgram's
 * key-creation API) so the long-lived DEEPGRAM_API_KEY would never reach
 * client code. That requires the account/key to have 'keys:write' scope,
 * which this project's Deepgram key doesn't have. The user explicitly chose
 * to skip fixing that and send the permanent key directly instead. It's
 * still only reachable through our authenticated + rate-limited endpoint
 * (never hardcoded in the extension/web source), but it IS a real, ongoing
 * exposure: anyone who captures a client's network traffic or reads the
 * extension's runtime gets a working, non-expiring Deepgram credential.
 * Revisit by fixing the key's scope and switching back to
 * `mintTemporaryDeepgramKey`-style short-lived keys if this matters later.
 */
export async function getDeepgramClientKey(): Promise<{ key: string; expiresInSeconds: number }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY must be set in .env to enable live transcription.");
  }
  return { key: apiKey, expiresInSeconds: 0 };
}

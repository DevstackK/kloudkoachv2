const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Rachel - a calm, professional default voice. Overridable per-deployment
// via ELEVENLABS_VOICE_ID without a code change.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/**
 * Synthesizes speech for the AI interviewer's question. Proxied through our
 * own server (same reasoning as the SMTP2GO/Deepgram key pattern) so the
 * ElevenLabs API key never reaches client code - the client just gets back
 * playable audio bytes.
 */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY must be set in .env to enable the AI interviewer's voice.");
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const res = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return res.arrayBuffer();
}

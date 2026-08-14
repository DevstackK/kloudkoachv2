// Proxies pronunciation scoring through our own server so the Speechace API
// key never reaches client code - same reasoning as lib/elevenlabs.ts and
// lib/deepgram-token minting.
const SPEECHACE_URL = "https://api.speechace.co/api/scoring/text/v9/json";

export type SpeechacePhoneScore = {
  phone: string;
  quality_score: number;
  sound_most_like?: string;
};

export type SpeechaceWordScore = {
  word: string;
  quality_score: number;
  phone_score_list?: SpeechacePhoneScore[];
};

export type SpeechaceResult = {
  status: string;
  text_score: {
    text: string;
    word_score_list: SpeechaceWordScore[];
    speechace_score: { pronunciation: number }; // 0-100
    ielts_score?: { pronunciation: number };
    cefr_score?: { pronunciation: string };
  };
};

/**
 * Scores how closely a recorded clip matches a reference sentence. Speechace
 * takes the raw audio file directly (no separate transcription step needed
 * on our side) - WebM/Opus, which MediaRecorder produces natively in
 * Chrome, is one of its natively supported formats.
 */
export async function scorePronunciation(referenceText: string, audio: Blob, dialect = "en-us"): Promise<SpeechaceResult> {
  const apiKey = process.env.SPEECHACE_API_KEY;
  if (!apiKey) {
    throw new Error("SPEECHACE_API_KEY must be set in .env to enable pronunciation scoring.");
  }

  const form = new FormData();
  form.append("text", referenceText);
  form.append("user_audio_file", audio, "clip.webm");
  form.append("include_fluency", "1");

  const url = `${SPEECHACE_URL}?key=${encodeURIComponent(apiKey)}&dialect=${encodeURIComponent(dialect)}`;
  const res = await fetch(url, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Speechace scoring failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as SpeechaceResult;
  if (json.status !== "success") {
    throw new Error(`Speechace scoring returned status "${json.status}"`);
  }
  return json;
}

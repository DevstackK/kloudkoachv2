"use client";

import * as React from "react";

export type CompanionTurn = {
  question: string;
  answer: string;
  isStreaming: boolean;
};

export type CompanionStatus = "idle" | "connecting" | "listening" | "thinking" | "error" | "stopped";

/**
 * Mic-capture + live-transcription + coaching loop for the phone companion
 * page. Deliberately a separate hook from useCoachSession rather than a
 * shared one: this always captures the phone's own mic (never tab audio),
 * never creates a CoachingSession (one already exists - the laptop made
 * it), and authenticates via the companion bearer token instead of the
 * httpOnly web session cookie.
 */
// A phone mic (unlike tab-audio) picks up BOTH sides of the conversation -
// the interviewer's voice off the laptop speaker AND the candidate's own
// voice reading the suggested answer aloud. Without a cooldown, that
// read-aloud answer gets transcribed and mistaken for a new question the
// instant it ends, generating another answer, which gets read aloud too,
// spiraling. Roughly estimate how long the answer takes to speak (avg
// ~2.3 words/sec) and ignore new utterances for that long afterward.
const WORDS_PER_SECOND = 2.3;
const MIN_COOLDOWN_MS = 4000;
const MAX_COOLDOWN_MS = 22000;

export function useCompanionCapture(token: string) {
  const [status, setStatus] = React.useState<CompanionStatus>("idle");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [turns, setTurns] = React.useState<CompanionTurn[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  const wsRef = React.useRef<WebSocket | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const lastQuestionRef = React.useRef<string>("");
  const cooldownUntilRef = React.useRef<number>(0);
  const cooldownTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const respondTo = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
      if (trimmed.split(/\s+/).length < 3 || normalized === lastQuestionRef.current) {
        return;
      }
      lastQuestionRef.current = normalized;

      // Block new utterances for the ENTIRE thinking+streaming window, not
      // just after it finishes - responses are fast enough now that the
      // candidate starts reading the answer aloud while it's still
      // streaming in, and that self-pickup was completely unprotected
      // before, undoing the post-stream cooldown below.
      cooldownUntilRef.current = Infinity;
      setIsPaused(true);
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }

      setStatus("thinking");
      setTurns((prev) => [...prev, { question, answer: "", isStreaming: true }]);

      try {
        const res = await fetch("/api/coach/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to get a response.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullAnswer += chunk;
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last) next[next.length - 1] = { ...last, answer: last.answer + chunk };
            return next;
          });
        }

        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, isStreaming: false };
          return next;
        });

        const wordCount = fullAnswer.trim().split(/\s+/).filter(Boolean).length;
        const cooldownMs = Math.min(
          MAX_COOLDOWN_MS,
          Math.max(MIN_COOLDOWN_MS, (wordCount / WORDS_PER_SECOND) * 1000 + 2000)
        );
        cooldownUntilRef.current = Date.now() + cooldownMs;
        setIsPaused(true);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          setIsPaused(false);
          // Whatever the candidate's own voice left in the buffer during
          // the mute window is stale, self-generated noise - start
          // listening for the interviewer's actual next question fresh.
          setInterimTranscript("");
        }, cooldownMs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get a response.");
        // Don't leave the mic permanently muted on a failed request - the
        // success path is what sets a real cooldown; this just clears the
        // "Infinity" guard set at the top of this function.
        cooldownUntilRef.current = 0;
        setIsPaused(false);
      } finally {
        setStatus((prev) => (prev === "thinking" ? "listening" : prev));
      }
    },
    [token]
  );

  const start = React.useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      const tokenRes = await fetch("/api/deepgram-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.success) {
        throw new Error(tokenJson.message || "Could not start live transcription.");
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const ws = new WebSocket(
        // 1000ms is Deepgram's hard floor for utterance_end_ms on standard
        // plans - going lower isn't accepted and wouldn't help anyway,
        // since interim results only arrive roughly once a second.
        "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1000&vad_events=true",
        ["token", tokenJson.data.key]
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("listening");
        const recorder = new MediaRecorder(micStream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };
        recorder.start(250);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "UtteranceEnd") {
            setInterimTranscript((current) => {
              // Still cooling down from our own answer being read aloud -
              // this utterance is almost certainly the candidate's own
              // voice, not the interviewer. Drop it rather than answer it.
              if (current.trim() && Date.now() >= cooldownUntilRef.current) {
                respondTo(current.trim());
              }
              return "";
            });
            return;
          }
          const alt = msg.channel?.alternatives?.[0];
          if (!alt) return;
          if (msg.is_final) {
            // While muted, don't even accumulate - otherwise everything
            // said during the mute window (almost certainly the candidate
            // reading the answer aloud) silently piles up and fires the
            // instant the mute lifts, as if it were a fresh question.
            if (Date.now() < cooldownUntilRef.current) return;
            setInterimTranscript((prev) => `${prev} ${alt.transcript}`.trim());
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        setError("Live transcription connection error.");
        setStatus("error");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start listening.");
      setStatus("error");
    }
  }, [token, respondTo]);

  const stop = React.useCallback(() => {
    const hadActiveCapture = !!(mediaRecorderRef.current || wsRef.current);
    if (!hadActiveCapture) return;

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setIsPaused(false);
    setStatus("stopped");
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { status, interimTranscript, turns, error, isPaused, start, stop };
}

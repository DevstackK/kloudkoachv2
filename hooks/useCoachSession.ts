"use client";

import * as React from "react";

export type CoachTurn = {
  question: string;
  answer: string;
  isStreaming: boolean;
};

export type CoachStatus = "idle" | "connecting" | "listening" | "thinking" | "error" | "stopped";

type StartParams = {
  type: "mock_interview" | "live_interview";
  jobRole: string;
  jobDescription?: string;
};

export function useCoachSession() {
  const [status, setStatus] = React.useState<CoachStatus>("idle");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [turns, setTurns] = React.useState<CoachTurn[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const lastQuestionRef = React.useRef<string>("");

  const respondTo = React.useCallback(async (question: string) => {
    const currentSessionId = sessionIdRef.current;
    const trimmed = question.trim();
    if (!currentSessionId || !trimmed) return;

    // Skip near-empty fragments ("um", "okay") and immediate repeats
    // (e.g. the interviewer's mic re-triggering the same utterance) -
    // every skipped call is a full Claude request saved.
    const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (trimmed.split(/\s+/).length < 3 || normalized === lastQuestionRef.current) {
      return;
    }
    lastQuestionRef.current = normalized;

    setStatus("thinking");
    setTurns((prev) => [...prev, { question, answer: "", isStreaming: true }]);

    try {
      const res = await fetch("/api/coach/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: currentSessionId, question }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get a response.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a response.");
    } finally {
      setStatus((prev) => (prev === "thinking" ? "listening" : prev));
    }
  }, []);

  const start = React.useCallback(
    async (params: StartParams) => {
      setError(null);
      setTurns([]);
      setInterimTranscript("");
      setStatus("connecting");

      try {
        const sessionRes = await fetch("/api/coach/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(params),
        });
        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok || !sessionJson.success) {
          throw new Error(sessionJson.message || "Could not start session.");
        }
        setSessionId(sessionJson.data.sessionId);
        sessionIdRef.current = sessionJson.data.sessionId;

        const tokenRes = await fetch("/api/deepgram-token", { method: "POST", credentials: "include" });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.success) {
          throw new Error(tokenJson.message || "Could not start live transcription.");
        }

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;

        const ws = new WebSocket(
          "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1200&vad_events=true",
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
                if (current.trim()) respondTo(current.trim());
                return "";
              });
              return;
            }
            const alt = msg.channel?.alternatives?.[0];
            if (!alt) return;
            if (msg.is_final) {
              setInterimTranscript((prev) => `${prev} ${alt.transcript}`.trim());
            } else {
              // interim (non-final) result - not persisted, just shown live
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
        setError(err instanceof Error ? err.message : "Could not start session.");
        setStatus("error");
      }
    },
    [respondTo]
  );

  const stop = React.useCallback(() => {
    // Guard against React Strict Mode's dev-only double-invoke of effect
    // cleanup: it mounts, cleans up, and mounts again immediately, which
    // would otherwise call this unconditionally on first mount and flip
    // status to "stopped" before the user ever clicked Start.
    const hadActiveCapture = !!(mediaRecorderRef.current || wsRef.current || sessionIdRef.current);
    if (!hadActiveCapture) return;

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("stopped");

    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      fetch(`/api/coach/session/${currentSessionId}/stop`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    sessionIdRef.current = null;
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { status, interimTranscript, turns, error, sessionId, start, stop };
}

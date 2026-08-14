"use client";

import * as React from "react";
import { fetchWithAuthRetry } from "@/lib/fetchWithAuthRetry";

export type PatientTurn = { question: string; answer: string };

export type DiagnosisResult = {
  correct: boolean;
  score: number;
  feedback: string;
  revealedDiagnosis: string;
};

export type VirtualPatientStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "diagnosing"
  | "diagnosed"
  | "error"
  | "stopped";

type StartParams = {
  caseText?: string;
  caseLabel?: string;
  specialty?: string;
  difficulty?: "easy" | "medium" | "hard";
};

export function useVirtualPatient() {
  const [status, setStatus] = React.useState<VirtualPatientStatus>("idle");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [turns, setTurns] = React.useState<PatientTurn[]>([]);
  const [caseTitle, setCaseTitle] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = React.useState<DiagnosisResult | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const stopRef = React.useRef<() => void>(() => {});

  const speak = React.useCallback(async (text: string) => {
    setStatus("speaking");
    try {
      const res = await fetchWithAuthRetry("/api/interviewer/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not play the patient's voice.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioElRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(); // non-fatal - the text is already on screen either way
        };
        audio.play().catch(() => resolve());
      });
    } catch {
      // Non-fatal - the reply is already shown as text.
    } finally {
      setStatus((prev) => (prev === "speaking" ? "listening" : prev));
    }
  }, []);

  const respondTo = React.useCallback(
    async (question: string) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;

      setStatus("thinking");
      setError(null);
      setTurns((prev) => [...prev, { question, answer: "" }]);

      try {
        const res = await fetchWithAuthRetry("/api/virtual-patient/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId: currentSessionId, question }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "The patient didn't respond.");

        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { question, answer: json.data.text };
          return next;
        });
        await speak(json.data.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The patient didn't respond.");
        setStatus("listening");
      }
    },
    [speak]
  );

  const start = React.useCallback(
    async (params: StartParams) => {
      setError(null);
      setTurns([]);
      setDiagnosisResult(null);
      setInterimTranscript("");
      setStatus("connecting");

      try {
        const sessionRes = await fetchWithAuthRetry("/api/virtual-patient/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(params),
        });
        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok || !sessionJson.success) throw new Error(sessionJson.message || "Could not start the case.");
        setSessionId(sessionJson.data.sessionId);
        sessionIdRef.current = sessionJson.data.sessionId;
        setCaseTitle(sessionJson.data.caseTitle);

        const tokenRes = await fetchWithAuthRetry("/api/deepgram-token", { method: "POST", credentials: "include" });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.success) throw new Error(tokenJson.message || "Could not start live transcription.");

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;

        const ws = new WebSocket(
          "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1000&vad_events=true",
          ["token", tokenJson.data.key]
        );
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("listening");
          const recorder = new MediaRecorder(micStream, { mimeType: "audio/webm;codecs=opus" });
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
          };
          recorder.start(250);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "UtteranceEnd") {
              setInterimTranscript((current) => {
                const trimmed = current.trim();
                if (trimmed.split(/\s+/).length >= 2) respondTo(trimmed);
                return "";
              });
              return;
            }
            const alt = msg.channel?.alternatives?.[0];
            if (!alt) return;
            if (msg.is_final) {
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
        setError(err instanceof Error ? err.message : "Could not start the case.");
        setStatus("error");
      }
    },
    [respondTo]
  );

  const submitDiagnosis = React.useCallback(async (diagnosis: string) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || !diagnosis.trim()) return;

    setStatus("diagnosing");
    setError(null);
    try {
      const res = await fetchWithAuthRetry("/api/virtual-patient/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: currentSessionId, diagnosis: diagnosis.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not grade that diagnosis.");
      setDiagnosisResult(json.data);
      setStatus("diagnosed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grade that diagnosis.");
      setStatus("listening");
    }
  }, []);

  const stop = React.useCallback(() => {
    const hadActiveCapture = !!(mediaRecorderRef.current || wsRef.current || sessionIdRef.current);
    if (!hadActiveCapture) return;

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioElRef.current?.pause();
    setStatus("stopped");

    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      fetch(`/api/coach/session/${currentSessionId}/stop`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    sessionIdRef.current = null;
  }, []);

  stopRef.current = stop;
  React.useEffect(() => () => stop(), [stop]);

  return { status, interimTranscript, turns, caseTitle, error, sessionId, diagnosisResult, start, submitDiagnosis, stop };
}

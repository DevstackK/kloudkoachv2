"use client";

import * as React from "react";
import { fetchWithAuthRetry } from "@/lib/fetchWithAuthRetry";

export type WordScore = { word: string; score: number };

export type PronunciationResult = {
  overallScore: number; // 0-100
  ieltsScore: number | null;
  cefrScore: string | null;
  words: WordScore[];
  feedback: string;
};

export type PronunciationStatus =
  | "idle"
  | "loadingPrompt"
  | "ready" // prompt shown, waiting for the user to hit record
  | "recording"
  | "scoring"
  | "error"
  | "stopped";

export type Difficulty = "easy" | "medium" | "hard";

export function usePronunciationPractice() {
  const [status, setStatus] = React.useState<PronunciationStatus>("idle");
  const [promptText, setPromptText] = React.useState("");
  const [result, setResult] = React.useState<PronunciationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [promptCount, setPromptCount] = React.useState(0);

  const sessionIdRef = React.useRef<string | null>(null);
  const promptIdRef = React.useRef<string | null>(null);
  const difficultyRef = React.useRef<Difficulty>("medium");
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const fetchPrompt = React.useCallback(async (difficulty: Difficulty) => {
    setStatus("loadingPrompt");
    setError(null);
    setResult(null);
    try {
      const res = await fetchWithAuthRetry("/api/pronunciation/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: sessionIdRef.current ?? undefined, difficulty }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not get a practice sentence.");

      sessionIdRef.current = json.data.sessionId;
      promptIdRef.current = json.data.promptId;
      setSessionId(json.data.sessionId);
      setPromptText(json.data.text);
      setPromptCount((c) => c + 1);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get a practice sentence.");
      setStatus("error");
    }
  }, []);

  const start = React.useCallback(
    async (difficulty: Difficulty) => {
      difficultyRef.current = difficulty;
      sessionIdRef.current = null;
      setSessionId(null);
      setPromptCount(0);
      await fetchPrompt(difficulty);
    },
    [fetchPrompt]
  );

  const nextPrompt = React.useCallback(() => fetchPrompt(difficultyRef.current), [fetchPrompt]);

  const startRecording = React.useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      setStatus("recording");
    } catch {
      setError("Could not access your microphone.");
      setStatus("error");
    }
  }, []);

  const stopRecording = React.useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
    });
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    mediaRecorderRef.current = null;

    const currentSessionId = sessionIdRef.current;
    const currentPromptId = promptIdRef.current;
    if (!currentSessionId || !currentPromptId) return;

    setStatus("scoring");
    try {
      const form = new FormData();
      form.append("sessionId", currentSessionId);
      form.append("promptId", currentPromptId);
      form.append("audio", blob, "clip.webm");

      const res = await fetchWithAuthRetry("/api/pronunciation/score", { method: "POST", credentials: "include", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not score that recording.");

      setResult(json.data);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score that recording.");
      setStatus("error");
    }
  }, []);

  const stop = React.useCallback(() => {
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    micStreamRef.current = null;

    const currentSessionId = sessionIdRef.current;
    setStatus("stopped");
    if (currentSessionId) {
      fetch(`/api/coach/session/${currentSessionId}/stop`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    sessionIdRef.current = null;
  }, []);

  React.useEffect(
    () => () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return { status, promptText, result, error, sessionId, promptCount, start, startRecording, stopRecording, nextPrompt, stop };
}

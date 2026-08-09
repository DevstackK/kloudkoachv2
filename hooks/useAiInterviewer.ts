"use client";

import * as React from "react";

export type InterviewerTurn = {
  question: string;
  answer: string;
};

export type InterviewerStatus =
  | "idle"
  | "connecting"
  | "asking" // TTS audio playing
  | "listening" // mic capturing the candidate's answer
  | "thinking" // generating the next question
  | "scoring" // interview finished, generating per-question ratings/feedback
  | "done" // interview complete, scored
  | "error"
  | "stopped";

// How long to wait after Deepgram signals a pause before concluding the
// candidate has actually finished their answer (vs. just pausing mid-
// thought). Combined with Deepgram's own ~1s utterance_end_ms, someone
// needs roughly 4s of true silence before the interview moves on.
const ANSWER_SILENCE_GRACE_MS = 3000;

type StartParams = {
  jobRole: string;
  jobDescription?: string;
  // Questions are always spoken as natural prose regardless of this - it
  // only controls the format of the post-interview feedback text (bullets
  // read aloud would sound broken).
  answerStyle?: "prose" | "bullets";
};

// Same guard as the other coaching loops: skip near-empty fragments and
// immediate repeats so a stray "um" or a mic hiccup doesn't get submitted
// as the candidate's answer.
function isUsableAnswer(text: string, lastAnswer: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  return trimmed.split(/\s+/).length >= 3 && normalized !== lastAnswer;
}

export function useAiInterviewer() {
  const [status, setStatus] = React.useState<InterviewerStatus>("idle");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [turns, setTurns] = React.useState<InterviewerTurn[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = React.useState(0);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const sessionIdRef = React.useRef<string | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const lastAnswerRef = React.useRef<string>("");
  const stoppedRef = React.useRef(false);

  const speak = React.useCallback(async (text: string) => {
    setStatus("asking");
    const res = await fetch("/api/interviewer/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Could not play the interviewer's voice.");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioElRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Audio playback failed."));
      };
      audio.play().catch(reject);
    });
  }, []);

  const listenForAnswer = React.useCallback(async (): Promise<string> => {
    setStatus("listening");
    setInterimTranscript("");

    const tokenRes = await fetch("/api/deepgram-token", { method: "POST", credentials: "include" });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.success) throw new Error(tokenJson.message || "Could not start listening.");

    return new Promise<string>((resolve, reject) => {
      const ws = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1000&vad_events=true",
        ["token", tokenJson.data.key]
      );
      wsRef.current = ws;
      let buffer = "";
      let finishTimer: ReturnType<typeof setTimeout> | null = null;

      const cancelPendingFinish = () => {
        if (finishTimer) {
          clearTimeout(finishTimer);
          finishTimer = null;
        }
      };

      const finishAnswer = () => {
        const trimmed = buffer.trim();
        if (!isUsableAnswer(trimmed, lastAnswerRef.current)) return;
        lastAnswerRef.current = trimmed.toLowerCase().replace(/\s+/g, " ");
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current = null;
        ws.close();
        resolve(trimmed);
      };

      ws.onopen = () => {
        const stream = micStreamRef.current;
        if (!stream) {
          reject(new Error("Microphone not available."));
          return;
        }
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        recorder.start(250);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Deepgram's UtteranceEnd fires on any ~1s pause - real spoken
          // answers are full of those (gathering thoughts, breathing
          // between points), so treating the first one as "done answering"
          // cuts people off mid-thought. Instead, use it to START a longer
          // grace window: if they keep talking before it elapses, the
          // window gets cancelled and pushed out again; only genuine
          // extended silence actually concludes the answer.
          if (msg.type === "UtteranceEnd") {
            cancelPendingFinish();
            finishTimer = setTimeout(finishAnswer, ANSWER_SILENCE_GRACE_MS);
            return;
          }
          if (msg.type === "SpeechStarted") {
            // They're talking again - definitely not done, cancel early
            // rather than waiting for the next is_final to arrive.
            cancelPendingFinish();
            return;
          }
          const alt = msg.channel?.alternatives?.[0];
          if (alt && msg.is_final) {
            buffer = `${buffer} ${alt.transcript}`.trim();
            setInterimTranscript(buffer);
            cancelPendingFinish();
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => reject(new Error("Live transcription connection error."));
    });
  }, []);

  const runTurn = React.useCallback(
    async (previousAnswer?: string) => {
      setStatus("thinking");
      const res = await fetch("/api/interviewer/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: sessionIdRef.current, previousAnswer }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not get the next question.");

      if (previousAnswer) {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, answer: previousAnswer };
          return next;
        });
      }

      if (json.data.done) {
        setStatus("scoring");
        // Reuses the same rating/feedback generation the live/mock coaching
        // sessions already get on stop - this blocks until scores are
        // ready, so by the time status flips to "done" a results link is
        // immediately useful rather than pointing at an unscored session.
        await fetch(`/api/coach/session/${sessionIdRef.current}/stop`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        setStatus("done");
        return;
      }

      setQuestionNumber(json.data.questionNumber);
      setTurns((prev) => [...prev, { question: json.data.question, answer: "" }]);

      await speak(json.data.question);
      if (stoppedRef.current) return;

      const answer = await listenForAnswer();
      if (stoppedRef.current) return;

      await runTurn(answer);
    },
    [speak, listenForAnswer]
  );

  const start = React.useCallback(
    async (params: StartParams) => {
      setError(null);
      setTurns([]);
      setQuestionNumber(0);
      stoppedRef.current = false;
      setStatus("connecting");

      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionRes = await fetch("/api/coach/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: "ai_interview",
            jobRole: params.jobRole,
            jobDescription: params.jobDescription,
            answerStyle: params.answerStyle,
          }),
        });
        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok || !sessionJson.success) throw new Error(sessionJson.message || "Could not start session.");
        sessionIdRef.current = sessionJson.data.sessionId;
        setSessionId(sessionJson.data.sessionId);

        await runTurn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start the interview.");
        setStatus("error");
      }
    },
    [runTurn]
  );

  const stop = React.useCallback(() => {
    // Guard against React Strict Mode's dev-only double-invoke of effect
    // cleanup (mount -> cleanup -> mount) flipping status to "stopped"
    // before the user ever clicked Start.
    const hadActiveSession = !!(mediaRecorderRef.current || wsRef.current || sessionIdRef.current || micStreamRef.current);
    if (!hadActiveSession) return;

    stoppedRef.current = true;
    audioElRef.current?.pause();
    audioElRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      fetch(`/api/coach/session/${currentSessionId}/stop`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    sessionIdRef.current = null;
    setStatus("stopped");
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { status, interimTranscript, turns, error, questionNumber, sessionId, start, stop };
}

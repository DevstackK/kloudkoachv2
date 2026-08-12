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

// Tracks exactly which step of a turn is in flight, so a failure (most
// commonly the access-token cookie expiring mid-session - interviews can
// run well past its ~15min lifetime) can be retried from that same step
// instead of forcing the whole interview to restart from question 1.
// answeringId/questionId thread the specific InteractionRecord id through
// each step - without it, a retry of a request that actually succeeded
// server-side (but whose response the client never received) could attach
// a stale answer to a different, newer question than the one it was for.
type ResumePoint =
  | { type: "question"; previousAnswer?: string; answeringId?: string }
  | { type: "speak"; question: string; questionId: string }
  | { type: "listen"; questionId: string };

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
  const resumePointRef = React.useRef<ResumePoint>({ type: "question" });

  // A 401 here almost always means the short-lived access-token cookie
  // expired mid-interview, not that the user is actually logged out - the
  // refresh-token cookie is still valid. Silently reissue it and retry
  // once before surfacing anything to the user.
  const fetchWithAuthRetry = React.useCallback(async (url: string, options: RequestInit) => {
    let res = await fetch(url, options);
    if (res.status === 401) {
      await fetch("/api/auth/me", { credentials: "include" }).catch(() => {});
      res = await fetch(url, options);
    }
    return res;
  }, []);

  const speak = React.useCallback(
    async (text: string) => {
      setStatus("asking");
      const res = await fetchWithAuthRetry("/api/interviewer/speak", {
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
    },
    [fetchWithAuthRetry]
  );

  const listenForAnswer = React.useCallback(async (): Promise<string> => {
    setStatus("listening");
    setInterimTranscript("");

    const tokenRes = await fetchWithAuthRetry("/api/deepgram-token", { method: "POST", credentials: "include" });
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
  }, [fetchWithAuthRetry]);

  // Single state machine covering all three steps of a turn (ask -> speak
  // -> listen -> ask...), with ONE error boundary that records exactly
  // which step was in flight (resumePointRef) before attempting it - so a
  // retry resumes from that exact step instead of re-asking a question
  // that already went out, or losing the interview's progress entirely.
  const runFrom = React.useCallback(
    async (point: ResumePoint): Promise<void> => {
      resumePointRef.current = point;
      try {
        setError(null);

        if (point.type === "question") {
          setStatus("thinking");
          const res = await fetchWithAuthRetry("/api/interviewer/question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              previousAnswer: point.previousAnswer,
              answeringId: point.answeringId,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message || "Could not get the next question.");

          if (point.previousAnswer) {
            const answeredText = point.previousAnswer;
            setTurns((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last) next[next.length - 1] = { ...last, answer: answeredText };
              return next;
            });
          }

          if (json.data.done) {
            setStatus("scoring");
            // Reuses the same rating/feedback generation the live/mock
            // coaching sessions already get on stop - this blocks until
            // scores are ready, so by the time status flips to "done" a
            // results link is immediately useful.
            await fetch(`/api/coach/session/${sessionIdRef.current}/stop`, {
              method: "POST",
              credentials: "include",
            }).catch(() => {});
            setStatus("done");
            return;
          }

          setQuestionNumber(json.data.questionNumber);
          setTurns((prev) => [...prev, { question: json.data.question, answer: "" }]);
          if (stoppedRef.current) return;
          await runFrom({ type: "speak", question: json.data.question, questionId: json.data.questionId });
          return;
        }

        if (point.type === "speak") {
          await speak(point.question);
          if (stoppedRef.current) return;
          await runFrom({ type: "listen", questionId: point.questionId });
          return;
        }

        // point.type === "listen"
        const answer = await listenForAnswer();
        if (stoppedRef.current) return;
        await runFrom({ type: "question", previousAnswer: answer, answeringId: point.questionId });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    },
    [speak, listenForAnswer, fetchWithAuthRetry]
  );

  // Resumes the interview from whatever step last failed, without
  // resetting turns/session/question progress.
  const retry = React.useCallback(() => {
    if (stoppedRef.current) return;
    runFrom(resumePointRef.current);
  }, [runFrom]);

  const start = React.useCallback(
    async (params: StartParams) => {
      setError(null);
      setTurns([]);
      setQuestionNumber(0);
      setSessionId(null);
      sessionIdRef.current = null;
      stoppedRef.current = false;
      resumePointRef.current = { type: "question" };
      setStatus("connecting");

      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionRes = await fetchWithAuthRetry("/api/coach/session", {
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

        await runFrom({ type: "question" });
      } catch (err) {
        // Failures here (mic permission, session creation) happen before
        // any turn/progress exists, so there's nothing to preserve -
        // falling back to the setup form is correct, unlike a mid-
        // interview failure inside runFrom.
        setError(err instanceof Error ? err.message : "Could not start the interview.");
        setStatus("error");
      }
    },
    [runFrom, fetchWithAuthRetry]
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

  return { status, interimTranscript, turns, error, questionNumber, sessionId, start, stop, retry };
}

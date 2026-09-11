# KloudKoach agent worker (v3 scaffold)

Separate process from the Next.js app. Stays connected to LiveKit and
handles the audio -> STT -> answer pipeline server-side, replacing v2's
browser-to-Deepgram WebSocket (`lib/deepgram.ts`, `hooks/useCompanionCapture`)
and the phone companion's polling loop.

Status: skeleton only (`src/worker.ts`) - the LiveKit audio-track
subscription and Deepgram streaming loop are stubbed with a `TODO`. Nothing
in the main app depends on this yet; v2 is untouched and still works as-is.

## Setup

```
cd agent-worker
npm install
cp .env.example .env   # fill in LiveKit + Deepgram + app URL
npm run dev
```

## How it fits together

1. Browser hits `POST /api/livekit/token` (in the main app) with its existing
   companion token -> gets a LiveKit room + participant JWT.
2. Browser publishes its mic track into that LiveKit room via `livekit-client`.
3. This worker gets auto-dispatched into the room, subscribes to the audio
   track, streams it to Deepgram, and on each finalized transcript calls the
   main app's existing `POST /api/coach/respond` (unchanged) with the same
   companion token (read back from room metadata) to get a suggested answer.
4. The worker publishes that answer back into the room as a LiveKit data
   message; both the laptop and any phone that joined the same room receive
   it in real time.

## Deploying

This needs to run as a long-lived process (small container / VM / Fly.io /
Railway service, etc.) - it cannot be a Vercel/Next.js serverless function
because it holds a persistent connection to LiveKit.

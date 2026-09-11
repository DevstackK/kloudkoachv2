/**
 * v3 scaffold - NOT wired up yet, NOT run by the Next.js app.
 *
 * A LiveKit Agents worker: a standalone process that stays connected to
 * LiveKit's control plane and gets dispatched into any room named
 * "interview-*" (see app/api/livekit/token/route.ts) as soon as a
 * participant joins.
 *
 * Per room, this does the job the browser used to do alone in v2
 * (lib/deepgram.ts): open a Deepgram live-transcription stream, but now
 * server-side, fed by whichever LiveKit participant is publishing audio
 * (laptop or phone) instead of a browser-held Deepgram key. On each final
 * transcript it calls back into the existing Next.js app's unchanged
 * /api/coach/respond (Bearer-companion-token auth, same as v2) to get a
 * suggested answer, then publishes that answer to the room as a data
 * message so every connected participant sees it immediately - replacing
 * the phone's v2 polling loop.
 *
 * We use AgentSession with only `stt` configured (no llm/tts): its RoomIO
 * auto-subscribes to the linked participant's audio and feeds it to the
 * STT plugin for us, so this doesn't hand-roll AudioStream/track
 * subscription plumbing.
 *
 * Run with: npm run dev   (inside agent-worker/, with LIVEKIT_URL,
 * LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DEEPGRAM_API_KEY, and
 * KLOUDKOACH_APP_URL set in agent-worker/.env)
 */
import "dotenv/config";
import {
  Agent,
  AgentSession,
  AgentSessionEventTypes,
  WorkerOptions,
  cli,
  defineAgent,
  type JobContext,
  type UserInputTranscribedEvent,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import { fileURLToPath } from "node:url";

const KLOUDKOACH_APP_URL = process.env.KLOUDKOACH_APP_URL ?? "http://localhost:3000";

async function askKloudKoachForAnswer(companionToken: string, question: string): Promise<string | null> {
  const res = await fetch(`${KLOUDKOACH_APP_URL}/api/coach/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${companionToken}`,
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    console.error(`/api/coach/respond returned ${res.status}`);
    return null;
  }
  const json = await res.json();
  return json?.answer ?? null; // TODO: confirm exact response field name against app/api/coach/respond/route.ts
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const { companionToken } = JSON.parse(ctx.room.metadata || "{}") as { companionToken?: string };
    if (!companionToken) {
      console.error(`Room ${ctx.room.name} has no companionToken in metadata - cannot call /api/coach/respond.`);
      return;
    }

    await ctx.connect();

    const session = new AgentSession({
      stt: new deepgram.STT({
        apiKey: process.env.DEEPGRAM_API_KEY,
        model: "nova-2",
        interimResults: true,
      }),
      // No vad/llm/tts: this session only transcribes. Answer generation
      // stays in the existing Next.js app via askKloudKoachForAnswer below,
      // so the interview-coaching prompt logic isn't duplicated here.
    });

    session.on(AgentSessionEventTypes.UserInputTranscribed, async (ev: UserInputTranscribedEvent) => {
      if (!ev.isFinal || !ev.transcript.trim()) return;

      const answer = await askKloudKoachForAnswer(companionToken, ev.transcript);
      if (!answer) return;

      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "answer", question: ev.transcript, text: answer })),
        { reliable: true, topic: "kloudkoach-answer" }
      );
    });

    await session.start({
      // instructions is required by Agent's constructor but unused here -
      // no llm is configured, so nothing ever reads it.
      agent: new Agent({ instructions: "Transcription only; no LLM/TTS is configured on this agent." }),
      room: ctx.room,
    });
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));

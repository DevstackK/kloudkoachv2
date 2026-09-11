# Kloud Koach

AI-powered interview coaching — resume parsing, exam prep, mock interview practice, and a live
interview co-pilot (web + phone companion), built on Next.js and Claude.

## Stack

- **Next.js 15** (App Router, TypeScript) — deployed on Vercel
- **Postgres + Prisma** (driver adapter, not the native engine binary — required for ARM64 dev
  machines and plays nicely with serverless)
- **Anthropic Claude** — resume parsing, exam generation, live coaching answers, session scoring
- **Deepgram** — live speech-to-text for the mic/tab-audio coaching pipeline
- **Stripe** — subscription billing
- **QR phone companion** (`app/companion/[token]`) — WhatsApp-Web-style pairing so suggested
  answers can show on your phone instead of your shared screen

## Local development

1. **Install dependencies**
   ```
   npm install
   ```

2. **Start Postgres.** `docker-compose.yml` provides a local instance:
   ```
   docker compose up -d
   ```
   (On Windows, if Docker Desktop is unreliable, running Docker natively inside a WSL2 distro
   works — see `docker-compose.yml`; just make sure something keeps the WSL VM alive, e.g. a
   long-lived `wsl -d <distro> -e sleep 999999` process, since WSL2 idles out and kills containers
   otherwise.)

3. **Copy `.env.example` to `.env`** and fill in the values you have. At minimum you need
   `DATABASE_URL` and `ANTHROPIC_API_KEY` to run the core app; Deepgram/Stripe keys unlock the
   live-coaching and billing features respectively (routes fail gracefully with a clear message
   if those are missing, so the rest of the app still works without them).

4. **Run migrations and seed the plans:**
   ```
   npm run db:migrate
   npm run db:seed
   ```

5. **If you've set `STRIPE_SECRET_KEY`,** sync your Plan and CreditPack rows to real Stripe Products/Prices:
   ```
   npm run stripe:sync
   ```

6. **Start the dev server:**
   ```
   npm run dev
   ```

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable | Required for |
|---|---|
| `DATABASE_URL` | Everything |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth |
| `ANTHROPIC_API_KEY` | Resume parsing, exam prep, live coaching, session scoring |
| `DEEPGRAM_API_KEY` / `DEEPGRAM_PROJECT_ID` | Live speech-to-text (mock interview) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing |
| `NEXT_PUBLIC_APP_URL` | Stripe redirect URLs, companion QR links |

## Deploying to Vercel

This is a standard Next.js app — connect the repo in Vercel and it builds natively (no Docker
needed). Set the environment variables above in the Vercel project settings, then:

- Point `DATABASE_URL` at a hosted Postgres (Neon, Vercel Postgres, Supabase, etc.)
- Add a Stripe webhook endpoint pointing at `https://<your-domain>/api/billing/webhook` and put
  its signing secret in `STRIPE_WEBHOOK_SECRET`
- Run `npm run db:migrate` and `npm run db:seed` against the production database once (from a
  machine with `DATABASE_URL` pointed at prod), then `npm run stripe:sync`

`Dockerfile` is only needed if you want to self-host somewhere other than Vercel.

## Architecture notes

- **Model routing**: live coaching answers default to a cheap/fast model and only escalate to a
  stronger model for genuinely complex questions (see `lib/anthropic.ts`). Resume parsing, exam
  generation, and session scoring always use the stronger model since they're low-frequency and
  quality-sensitive.
- **Prompt caching**: the system prompt (resume + job context) is cached across turns within a
  live session, since it repeats every turn but rarely changes.
- **AI call logging**: every Claude call logs model, token counts, latency, and success/failure as
  structured JSON (`lib/aiLogger.ts`) — searchable in your log drain for cost/usage observability.
- **Rate limiting**: in-memory sliding-window limiter (`lib/rateLimit.ts`) on all AI-calling and
  auth endpoints. Fine for a single instance; swap in a shared store (e.g. Upstash Redis) behind
  the same function signature if you scale to multiple instances.

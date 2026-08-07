# InterviewGrade v2

InterviewGrade is an AI-powered practice platform for organisations, coaches and learners.

> Turn a real-world scenario into a speaking practice, define what good looks like with a rubric, share it, and give useful feedback after every attempt.

## Core loop

```text
Creator
  ↓
Create or AI-generate practice
  ↓
Scenario + questions + rubric
  ↓
Publish immutable version
  ↓
Share /p/<slug> or embed /embed/<slug>
  ↓
Participant answers by voice
  ↓
Transcription
  ↓
Rubric-based response feedback
  ↓
Retry or continue
  ↓
Final report
  ↓
Creator results
```

Interview/career practice is the first wedge. The domain is intentionally generic enough for sales role-play, customer service, management conversations, coaching and professional training without rebuilding the engine.

## Stack

- Next.js 16 + React 19 + strict TypeScript
- Tailwind CSS 4
- PostgreSQL + Drizzle ORM/migrations
- Supabase Auth and managed Postgres infrastructure
- OpenAI generation, transcription, evaluation and optional question speech
- Stripe Checkout, Customer Portal and signed subscription webhooks
- Vercel deployment target
- Zod validation at external/AI boundaries

Supabase is deliberately **not** the application query architecture. Business data flows through server modules → Drizzle → PostgreSQL. This keeps the domain understandable and makes the database host replaceable.

## Core domain

```text
Profile
Organization
  ├─ Subscription
  ↓
Practice
  ↓
PracticeVersion
  ├─ PracticeQuestion
  └─ RubricCriterion
       ↓
Session
  ↓
Response (attempt 1, 2, ...)
  ↓
ResponseEvaluation
  ↓
SessionEvaluation
```

Draft content is mutable. Every publish creates an immutable numbered version, so a rubric edit tomorrow cannot change what an old score meant. Response retries are retained rather than overwritten.

## AI/scoring rule

Models produce criterion-level assessment and coaching text. **Application code calculates aggregate scores deterministically.** Model output is schema-constrained and validated before persistence.

InterviewGrade evaluation is coaching feedback, not personality/emotion detection or an automated high-stakes hiring decision.

## Implemented MVP path

- email/password sign-up and sign-in
- creator workspace/organisation
- manual practice builder
- AI-generated editable practice drafts
- draft editing
- versioned publishing
- shareable public practice URL
- embeddable practice player with microphone permission guidance
- anonymous or signed-in participant session
- browser microphone recording without client FFmpeg
- server-side transcription
- structured rubric feedback
- bounded retries and preserved attempts
- question TTS playback
- deterministic final scoring + AI coaching synthesis
- participant final report
- creator result overview + individual transcripts/attempts
- organization-scoped Stripe subscription foundation
- owner/admin Checkout and Customer Portal management
- signed webhook reconciliation of Stripe subscription state
- typecheck, lint, deterministic score tests and production build in CI

Billing state is established before entitlements. The application does not yet impose arbitrary free/paid feature limits; packaging can be decided independently and mapped onto the canonical organization subscription state later.

## Intentionally not in v2 MVP

The startup rebuild does not migrate the legacy employer candidate marketplace, candidate unlocking/tokens, resume matching, job tracker, course recommendations, sentiment/emotion scoring, or the permanent candidate/employer user split.

Distribution is intentionally ordered:

```text
hosted share link → iframe/embed → webhook/API only when customer demand proves it
```

## Embedding a practice

Published practices expose a creator-side **Copy embed code** action. It generates an iframe pointing at `/embed/<slug>` and includes `allow="microphone"`, which is required for participants to record voice answers inside the embedded experience.

## Billing

Subscriptions belong to an organization rather than an individual user. Owners/admins can start Stripe Checkout or open the Customer Portal. Stripe remains the source of truth: signed webhook events reconcile customer, subscription, price and status data into PostgreSQL. Price amount and cadence live in Stripe and are selected with `STRIPE_PRICE_ID`.

See [`docs/SETUP.md`](docs/SETUP.md) for the required Stripe webhook and environment configuration.

## Local setup

See [`docs/SETUP.md`](docs/SETUP.md).

Quick start after configuring `.env.local`:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Quality gate:

```bash
pnpm check
```

## Legacy reference

The original `jaynwanze/interviewgrade` repository remains the reference implementation for the final-year-project product. v2 selectively carries forward proven capabilities rather than carrying forward its product and architectural complexity.

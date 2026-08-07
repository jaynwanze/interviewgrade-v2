# InterviewGrade v2 setup

InterviewGrade deliberately treats Supabase as infrastructure rather than the application data-access layer. Business data is queried on the server through Drizzle/PostgreSQL. Supabase is used for Auth and as the intended managed Postgres host. Storage is intentionally not required while raw practice audio is not retained.

## 1. Prerequisites

- Node.js 22+
- pnpm 11.17+
- a Supabase project
- an OpenAI API key
- a Stripe account for organization subscriptions

## 2. Environment

Copy `.env.example` to `.env.local` and replace every placeholder:

```bash
cp .env.example .env.local
```

Required/configurable variables:

```text
DATABASE_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
OPENAI_EVALUATION_MODEL
OPENAI_GENERATION_MODEL
OPENAI_TRANSCRIPTION_MODEL
OPENAI_TTS_MODEL
OPENAI_TTS_VOICE
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
```

Use the Postgres connection string supplied by the Supabase project's **Connect** screen for `DATABASE_URL`; do not hand-construct credentials. The Postgres client disables prepared statements so it also works when a transaction-pooling connection is selected for deployment.

`NEXT_PUBLIC_SITE_URL` must be the canonical application origin: `http://localhost:3000` locally and the real HTTPS origin in production. It is used to construct trusted authentication, Stripe Checkout and billing-portal return URLs.

The browser receives only `NEXT_PUBLIC_*` values. `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only.

OpenAI model names and the Stripe recurring price ID are configuration rather than being scattered through components. They can be changed without changing product code.

## 3. Install

```bash
pnpm install --frozen-lockfile
```

## 4. Create the database schema

```bash
pnpm db:migrate
```

Migrations are generated from the Drizzle schemas under `src/lib/db/` and committed under `drizzle/`.

The v2 application does **not** query business tables through the Supabase Data API. Do not grant `anon` or `authenticated` direct CRUD access to these tables. If the project's API settings expose the `public` schema, keep table privileges restricted; server application access uses `DATABASE_URL` instead.

Before a public pilot, verify the Supabase project's Data API exposure/privileges in the dashboard. We intentionally do not recreate the legacy app's large RLS-policy system because application authorization lives in small server-side membership checks. Database-level restrictions remain defence in depth, not the business-logic layer.

## 5. Configure Supabase Auth

Enable email/password authentication in the Supabase project.

For local development, add the local app URL and callback to the project's allowed redirect URLs:

```text
http://localhost:3000
http://localhost:3000/auth/callback
```

For production, add the production equivalents, for example:

```text
https://interviewgrade.io
https://interviewgrade.io/auth/callback
```

The app uses the Supabase SSR cookie flow and verifies server-side JWT claims with `auth.getClaims()` before protected mutations. The callback accepts only local-path redirects, preventing an arbitrary external `next` URL from becoming an open redirect.

## 6. Configure Stripe billing

Create a recurring Stripe Price for the first organization subscription offering and set its `price_...` identifier as `STRIPE_PRICE_ID`. The amount and cadence live in Stripe rather than application code.

Set the server-side Stripe secret key as `STRIPE_SECRET_KEY`.

Configure a webhook endpoint pointing at:

```text
https://YOUR_APP_ORIGIN/api/stripe/webhook
```

Subscribe the endpoint to these events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

For local webhook testing, forward Stripe webhook events to `http://localhost:3000/api/stripe/webhook` using Stripe's supported local tooling and use that forwarding session's signing secret locally.

Stripe is the source of truth for subscription state. A successful browser return from Checkout does not itself activate a subscription; signed webhook events reconcile the organization billing row. Only organization owners/admins can start Checkout or open the billing portal.

The billing foundation intentionally does not enforce product limits yet. Add entitlements only after packaging has been decided so pricing experiments do not leak into the core practice domain.

## 7. Run locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

First-time creator flow:

```text
Sign up
→ verify email when required
→ create workspace
→ create/generate practice
→ edit draft
→ publish
→ copy share link or embed code
```

Participant flow:

```text
Open /p/<slug> or an embedded practice
→ start session
→ hear/read question
→ record answer
→ transcribe
→ rubric feedback
→ retry or continue
→ final report
```

## 8. Quality checks

Run the same checks as CI:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

or:

```bash
pnpm check
```

The first test suite covers deterministic score arithmetic. Provider-generated prose is deliberately not trusted to calculate aggregate scores.

## 9. Vercel

Connect this repository to Vercel and set the same environment variables there. Do not commit `.env.local` or any production secret.

Run `pnpm db:migrate` against the production database as a controlled deployment step before promoting application code that requires a new schema.

Before promoting a deployment, verify:

1. sign-up and sign-in;
2. email callback when confirmation is enabled;
3. workspace creation;
4. database migration has run;
5. manual practice creation/editing;
6. AI practice generation;
7. publication and copied share link;
8. embed code and microphone permission on a test host page;
9. public session creation;
10. browser microphone permission;
11. transcription and rubric feedback;
12. retry/continue behavior;
13. question speech playback;
14. final report;
15. creator results view;
16. Stripe Checkout in test mode;
17. signed webhook subscription reconciliation;
18. Stripe Customer Portal return flow.

## Current retention behavior

The MVP persists transcripts, response evaluations and final session evaluations. It does **not** currently persist raw audio: browser audio is posted to the transcription endpoint and discarded after transcription. This is intentional until a customer requirement justifies audio retention and its additional privacy/storage burden.

A response can be retried only a small bounded number of times per question so one public session cannot create unlimited evaluation spend. Production-wide rate limiting for session creation, generation, transcription, evaluation and speech remains a deployment hardening requirement; do not implement that with process-local memory on serverless infrastructure.

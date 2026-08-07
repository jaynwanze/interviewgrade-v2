# InterviewGrade v2 setup

The application deliberately treats Supabase as infrastructure rather than the application data-access layer. Business data is queried on the server through Drizzle/PostgreSQL. Supabase is currently used for Auth and as the intended managed Postgres host; Storage can be enabled later when we decide to retain audio.

## 1. Prerequisites

- Node.js 22+
- pnpm 11.17+
- a Supabase project
- an OpenAI API key

## 2. Environment

Copy `.env.example` to `.env.local` and replace every placeholder:

```bash
cp .env.example .env.local
```

Required variables:

```text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
OPENAI_EVALUATION_MODEL
OPENAI_GENERATION_MODEL
OPENAI_TRANSCRIPTION_MODEL
```

Use the Postgres connection string supplied by the Supabase project's **Connect** screen for `DATABASE_URL`; do not hand-construct credentials. The Postgres client is configured with prepared statements disabled so it can work with a transaction-pooling connection when that is the connection mode selected for deployment.

The browser receives only the Supabase URL and publishable key. `DATABASE_URL` and `OPENAI_API_KEY` are server-only.

## 3. Install

```bash
pnpm install --frozen-lockfile
```

## 4. Create the database schema

```bash
pnpm db:migrate
```

Migrations are generated from `src/lib/db/schema.ts` and committed under `drizzle/`.

The v2 application does **not** query business tables through the Supabase Data API. Do not grant `anon` or `authenticated` direct CRUD access to these tables. If the project's API settings expose the `public` schema, keep table privileges restricted; server application access uses `DATABASE_URL` instead.

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

The app uses the current Supabase SSR cookie flow and verifies server-side JWT claims with `auth.getClaims()` before protected mutations.

## 6. Run locally

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
→ publish
→ copy share link
```

## 7. Quality checks

Run the same checks as CI:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

or:

```bash
pnpm check
```

## 8. Vercel

Connect this repository to Vercel and set the same environment variables there. Do not commit `.env.local` or any production secret.

Before promoting a deployment, verify:

1. sign-up and sign-in;
2. workspace creation;
3. database migration has run;
4. AI practice generation;
5. public session creation;
6. browser microphone permission;
7. transcription and rubric feedback;
8. final report;
9. creator results view.

## Current retention behavior

The MVP persists transcripts and evaluations. It does **not** currently persist raw audio: browser audio is sent to the transcription endpoint and discarded after transcription. This is intentional until a customer requirement justifies audio retention and its additional privacy/storage burden.

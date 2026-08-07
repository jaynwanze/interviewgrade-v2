import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SessionPlayer } from '@/components/session/session-player';
import { getSessionPlayerState } from '@/modules/session/repository';

type SessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  const state = await getSessionPlayerState(sessionId);

  if (!state) notFound();

  if (state.session.status === 'completed' && state.finalEvaluation) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-14">
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-[var(--muted)]">
              Practice complete
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              {state.version.title}
            </h1>
            <div className="pt-3">
              <span className="text-7xl font-semibold tracking-tight">
                {state.finalEvaluation.overallScore}
              </span>
              <span className="ml-2 text-xl text-[var(--muted)]">/ 100</span>
            </div>
            <p className="mx-auto max-w-2xl leading-7 text-[var(--muted)]">
              {state.finalEvaluation.summary}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border p-6">
              <h2 className="font-semibold">What worked</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
                {state.finalEvaluation.strengths.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border p-6">
              <h2 className="font-semibold">Focus next</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
                {state.finalEvaluation.improvements.map((item) => (
                  <li key={item}>→ {item}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl bg-[var(--surface)] p-6">
            <h2 className="font-semibold">Recommendations</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              {state.finalEvaluation.recommendations.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/p/${state.practice.slug}`}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-[var(--accent-foreground)]"
            >
              Practise again
            </Link>
            <Link href="/" className="rounded-xl border px-5 py-3 font-medium">
              Done
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state.session.status !== 'in_progress') {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16 text-center">
        <div>
          <h1 className="text-2xl font-semibold">This session is no longer active.</h1>
          <Link
            href={`/p/${state.practice.slug}`}
            className="mt-5 inline-block rounded-lg border px-4 py-2 font-medium"
          >
            Start a new practice
          </Link>
        </div>
      </main>
    );
  }

  const currentQuestion = state.questions[state.session.currentQuestionPosition];
  if (!currentQuestion) notFound();

  const latestCurrentAttempt = state.attempts
    .filter(
      (attempt) =>
        attempt.response.questionId === currentQuestion.id && attempt.evaluation,
    )
    .sort((a, b) => b.response.attemptNumber - a.response.attemptNumber)[0];

  return (
    <SessionPlayer
      sessionId={state.session.id}
      practiceTitle={state.version.title}
      scenario={state.version.scenario}
      question={{
        id: currentQuestion.id,
        prompt: currentQuestion.prompt,
        position: currentQuestion.position,
      }}
      questionCount={state.questions.length}
      initialAttempt={
        latestCurrentAttempt?.evaluation
          ? {
              transcript: latestCurrentAttempt.response.transcript,
              feedback: {
                score: latestCurrentAttempt.evaluation.score,
                summary: latestCurrentAttempt.evaluation.summary,
                strengths: latestCurrentAttempt.evaluation.strengths,
                improvements: latestCurrentAttempt.evaluation.improvements,
                nextStep: latestCurrentAttempt.evaluation.nextStep,
              },
            }
          : null
      }
    />
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { getCreatorSessionResult } from '@/modules/results/repository';

type CreatorSessionResultPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function CreatorSessionResultPage({
  params,
}: CreatorSessionResultPageProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const result = await getCreatorSessionResult(sessionId, user.id);

  if (!result) notFound();

  const attemptsByQuestion = new Map<
    string,
    typeof result.attempts
  >();

  for (const attempt of result.attempts) {
    const current = attemptsByQuestion.get(attempt.response.questionId) ?? [];
    current.push(attempt);
    attemptsByQuestion.set(attempt.response.questionId, current);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Link
            href={`/dashboard/practices/${result.practice.id}/results`}
            className="text-sm text-[var(--muted)]"
          >
            ← Practice results
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            {result.version.title}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Session started {result.session.startedAt.toLocaleString()} · version{' '}
            {result.version.versionNumber}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1.5 text-sm capitalize">
          {result.session.status.replace('_', ' ')}
        </span>
      </header>

      {result.finalEvaluation ? (
        <section className="mb-8 rounded-2xl border p-6">
          <div className="grid gap-6 md:grid-cols-[170px_1fr]">
            <div>
              <p className="text-sm text-[var(--muted)]">Overall score</p>
              <p className="mt-1 text-6xl font-semibold tracking-tight">
                {result.finalEvaluation.overallScore}
              </p>
              <p className="text-sm text-[var(--muted)]">/ 100</p>
            </div>
            <div>
              <h2 className="font-semibold">Final coaching summary</h2>
              <p className="mt-2 leading-7 text-[var(--muted)]">
                {result.finalEvaluation.summary}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold">Strengths</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {result.finalEvaluation.strengths.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Improvements</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {result.finalEvaluation.improvements.map((item) => (
                  <li key={item}>→ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Recommendations</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {result.finalEvaluation.recommendations.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed p-5 text-sm text-[var(--muted)]">
          This session does not have a final evaluation yet.
        </div>
      )}

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Responses</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Retries are preserved so you can see how the participant changed their answer.
          </p>
        </div>

        {result.questions.map((question) => {
          const attempts = attemptsByQuestion.get(question.id) ?? [];

          return (
            <article key={question.id} className="rounded-2xl border p-6">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Question {question.position + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{question.prompt}</h3>
              </div>

              {attempts.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No answer recorded.</p>
              ) : (
                <div className="space-y-4">
                  {attempts.map((attempt) => (
                    <div key={attempt.response.id} className="rounded-xl bg-[var(--surface)] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          Attempt {attempt.response.attemptNumber}
                        </p>
                        <span className="text-lg font-semibold">
                          {attempt.evaluation?.score ?? '—'}
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                          Transcript
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {attempt.response.transcript}
                        </p>
                      </div>
                      {attempt.evaluation ? (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            {attempt.evaluation.summary}
                          </p>
                          {attempt.evaluation.improvements.length > 0 ? (
                            <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                              {attempt.evaluation.improvements.map((item) => (
                                <li key={item}>→ {item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

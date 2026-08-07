'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { retryResponseEvaluationAction } from '@/modules/session/response-actions';

type PendingFeedbackRecoveryProps = {
  sessionId: string;
  responseId: string;
  questionNumber: number;
  questionCount: number;
  question: string;
  transcript: string;
};

export function PendingFeedbackRecovery({
  sessionId,
  responseId,
  questionNumber,
  questionCount,
  question,
  transcript,
}: PendingFeedbackRecoveryProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    try {
      setIsRetrying(true);
      setError(null);
      await retryResponseEvaluationAction({ sessionId, responseId });
      router.refresh();
    } catch (caught) {
      console.error(caught);
      setError(
        'Your answer is still saved, but feedback is temporarily unavailable. Try again in a moment.',
      );
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">
            Question {questionNumber} of {questionCount}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{question}</h1>
        </div>

        <section className="rounded-2xl border p-6">
          <p className="text-sm font-medium">Your answer was saved</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Feedback did not finish generating. You do not need to record this
            answer again.
          </p>
          <details className="mt-5 rounded-xl bg-[var(--surface)] p-4">
            <summary className="cursor-pointer text-sm font-medium">
              View transcript
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {transcript}
            </p>
          </details>
        </section>

        {error ? (
          <p className="rounded-xl border p-4 text-sm text-[var(--muted)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void retry()}
          disabled={isRetrying}
          className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          {isRetrying ? 'Generating feedback…' : 'Retry feedback'}
        </button>
      </div>
    </main>
  );
}

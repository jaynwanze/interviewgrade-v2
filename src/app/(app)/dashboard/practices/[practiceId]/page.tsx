import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { publishPracticeAction } from '@/modules/practice/actions';
import { getPracticeDraft } from '@/modules/practice/repository';

type PracticePageProps = {
  params: Promise<{ practiceId: string }>;
};

export default async function PracticePage({ params }: PracticePageProps) {
  const user = await requireUser();
  const { practiceId } = await params;
  const draft = await getPracticeDraft(practiceId, user.id);

  if (!draft) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 border-b pb-6">
        <div className="space-y-2">
          <Link
            href={`/dashboard?organization=${draft.practice.organizationId}`}
            className="text-sm text-[var(--muted)]"
          >
            ← Practices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {draft.version.title}
            </h1>
            <span className="rounded-full border px-2.5 py-1 text-xs capitalize">
              {draft.practice.status}
            </span>
          </div>
          {draft.version.description ? (
            <p className="max-w-2xl text-[var(--muted)]">
              {draft.version.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/practices/${draft.practice.id}/results`}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Results
          </Link>
          {draft.practice.status === 'published' ? (
            <Link
              href={`/p/${draft.practice.slug}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Open participant view
            </Link>
          ) : null}
          <form action={publishPracticeAction}>
            <input type="hidden" name="practiceId" value={draft.practice.id} />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
            >
              {draft.practice.status === 'published'
                ? 'Publish new version'
                : 'Publish'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-6">
            <h2 className="font-semibold">Scenario</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--muted)]">
              {draft.version.scenario}
            </p>
            {draft.version.instructions ? (
              <div className="mt-5 rounded-xl bg-[var(--surface)] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Instructions
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {draft.version.instructions}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border p-6">
            <h2 className="font-semibold">Questions</h2>
            <div className="mt-4 space-y-3">
              {draft.questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-xl bg-[var(--surface)] p-4"
                >
                  <p className="text-xs font-medium text-[var(--muted)]">
                    Question {question.position + 1}
                  </p>
                  <p className="mt-1 leading-6">{question.prompt}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="h-fit rounded-2xl border p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Rubric</h2>
            <span className="text-sm text-[var(--muted)]">
              {draft.criteria.reduce(
                (sum, criterion) => sum + criterion.weight,
                0,
              )}
              %
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {draft.criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{criterion.name}</p>
                  <span className="text-sm text-[var(--muted)]">
                    {criterion.weight}%
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {criterion.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

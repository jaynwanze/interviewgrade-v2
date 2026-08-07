import { notFound } from 'next/navigation';

import { getPublishedPracticeBySlug } from '@/modules/practice/repository';
import { startSessionAction } from '@/modules/session/actions';

type EmbeddedPracticePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EmbeddedPracticePage({ params }: EmbeddedPracticePageProps) {
  const { slug } = await params;
  const practice = await getPublishedPracticeBySlug(slug);

  if (!practice) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-8 sm:px-8 sm:py-10">
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            InterviewGrade
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {practice.version.title}
          </h1>
          {practice.version.description ? (
            <p className="leading-7 text-[var(--muted)]">
              {practice.version.description}
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Scenario
          </p>
          <p className="mt-3 whitespace-pre-wrap leading-7">
            {practice.version.scenario}
          </p>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[var(--surface)] p-3 sm:p-4">
            <p className="text-xs text-[var(--muted)]">Questions</p>
            <p className="mt-1 text-lg font-semibold">{practice.questions.length}</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-3 sm:p-4">
            <p className="text-xs text-[var(--muted)]">Time</p>
            <p className="mt-1 text-lg font-semibold">
              {practice.version.estimatedMinutes ?? '—'}
              {practice.version.estimatedMinutes ? ' min' : ''}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-3 sm:p-4">
            <p className="text-xs text-[var(--muted)]">Level</p>
            <p className="mt-1 truncate text-lg font-semibold">
              {practice.version.difficulty ?? 'Flexible'}
            </p>
          </div>
        </div>

        {practice.version.instructions ? (
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <p className="text-sm font-medium">Before you start</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {practice.version.instructions}
            </p>
          </div>
        ) : null}

        <form action={startSessionAction}>
          <input type="hidden" name="slug" value={practice.practice.slug} />
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-5 py-3.5 font-medium text-[var(--accent-foreground)]"
          >
            Start practice
          </button>
        </form>

        <p className="text-center text-xs leading-5 text-[var(--muted)]">
          Voice answers require microphone permission from the page hosting this embed.
        </p>
      </div>
    </main>
  );
}

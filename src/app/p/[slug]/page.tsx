import { notFound } from 'next/navigation';

import { getPublishedPracticeBySlug } from '@/modules/practice/repository';
import { startSessionAction } from '@/modules/session/actions';

type PublicPracticePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicPracticePage({ params }: PublicPracticePageProps) {
  const { slug } = await params;
  const practice = await getPublishedPracticeBySlug(slug);

  if (!practice) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--muted)]">InterviewGrade Practice</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {practice.version.title}
          </h1>
          {practice.version.description ? (
            <p className="text-lg leading-7 text-[var(--muted)]">
              {practice.version.description}
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Scenario
          </p>
          <p className="mt-3 whitespace-pre-wrap text-lg leading-8">
            {practice.version.scenario}
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Questions</p>
            <p className="mt-1 text-xl font-semibold">{practice.questions.length}</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Estimated time</p>
            <p className="mt-1 text-xl font-semibold">
              {practice.version.estimatedMinutes ?? '—'}
              {practice.version.estimatedMinutes ? ' min' : ''}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--muted)]">Difficulty</p>
            <p className="mt-1 text-xl font-semibold">
              {practice.version.difficulty ?? 'Flexible'}
            </p>
          </div>
        </div>

        {practice.version.instructions ? (
          <div className="rounded-xl bg-[var(--surface)] p-5">
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
      </div>
    </main>
  );
}

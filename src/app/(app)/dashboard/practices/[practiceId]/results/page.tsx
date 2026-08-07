import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { getPracticeResultsOverview } from '@/modules/results/repository';

type PracticeResultsPageProps = {
  params: Promise<{ practiceId: string }>;
};

export default async function PracticeResultsPage({
  params,
}: PracticeResultsPageProps) {
  const user = await requireUser();
  const { practiceId } = await params;
  const results = await getPracticeResultsOverview(practiceId, user.id);

  if (!results) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Link
            href={`/dashboard/practices/${practiceId}`}
            className="text-sm text-[var(--muted)]"
          >
            ← {results.title}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Results</h1>
        </div>
        <Link
          href={`/p/${results.practice.slug}`}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Open participant view
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-[var(--muted)]">Completions</p>
          <p className="mt-2 text-3xl font-semibold">{results.completions}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {results.totalSessions} sessions started
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-[var(--muted)]">Average score</p>
          <p className="mt-2 text-3xl font-semibold">
            {results.averageScore ?? '—'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            completed sessions only
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-[var(--muted)]">Needs most practice</p>
          <p className="mt-2 text-lg font-semibold">
            {results.weakestCriteria[0]?.name ?? 'Not enough data'}
          </p>
          {results.weakestCriteria[0] ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {results.weakestCriteria[0].score}/100 average
            </p>
          ) : null}
        </div>
      </section>

      {results.weakestCriteria.length > 0 ? (
        <section className="mt-8 rounded-2xl bg-[var(--surface)] p-6">
          <h2 className="font-semibold">Cohort weak points</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {results.weakestCriteria.map((criterion) => (
              <div key={criterion.name} className="rounded-xl border bg-[var(--background)] p-4">
                <p className="font-medium">{criterion.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {criterion.score}/100 average
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent sessions</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open a session to inspect transcripts and feedback.
          </p>
        </div>

        {results.recentSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-[var(--muted)]">
            No participant sessions yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b bg-[var(--surface)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <span>Session</span>
              <span>Version</span>
              <span>Status</span>
              <span>Score</span>
            </div>
            {results.recentSessions.map((row) => (
              <Link
                key={row.session.id}
                href={`/dashboard/results/${row.session.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-4 last:border-b-0 hover:bg-[var(--surface)]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {row.session.participantUserId ? 'Signed-in participant' : 'Anonymous participant'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {row.session.startedAt.toLocaleString()}
                  </p>
                </div>
                <span className="text-sm text-[var(--muted)]">v{row.versionNumber}</span>
                <span className="rounded-full border px-2.5 py-1 text-xs capitalize">
                  {row.session.status.replace('_', ' ')}
                </span>
                <span className="min-w-10 text-right font-medium">
                  {row.evaluation?.overallScore ?? '—'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

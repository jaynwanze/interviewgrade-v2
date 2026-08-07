import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <div className="max-w-3xl space-y-8">
        <div className="inline-flex rounded-full border px-3 py-1 text-sm text-[var(--muted)]">
          InterviewGrade v2
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Turn any real-world scenario into practice.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Create speaking exercises, define what good looks like with a rubric,
            share them with learners, and give useful AI feedback after every
            attempt.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--accent)] px-5 py-3 font-medium text-[var(--accent-foreground)]"
          >
            Create a practice
          </Link>
          <Link href="/login" className="rounded-lg border px-5 py-3 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

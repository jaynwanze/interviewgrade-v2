import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PracticeBuilderForm } from '@/components/practice/practice-builder-form';
import { requireUser } from '@/lib/auth/require-user';
import { getOrganizationsForUser } from '@/modules/organization/repository';

type NewPracticePageProps = {
  searchParams: Promise<{ organization?: string }>;
};

export default async function NewPracticePage({
  searchParams,
}: NewPracticePageProps) {
  const user = await requireUser();
  const organizations = await getOrganizationsForUser(user.id);

  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  const query = await searchParams;
  const selected =
    organizations.find((organization) => organization.id === query.organization) ??
    organizations[0];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="space-y-2">
          <Link
            href={`/dashboard?organization=${selected.id}`}
            className="text-sm text-[var(--muted)]"
          >
            ← Back to practices
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create practice
          </h1>
          <p className="text-[var(--muted)]">
            Start with the scenario, then define the questions and the rubric.
          </p>
        </div>
        <Link
          href={`/dashboard/practices/generate?organization=${selected.id}`}
          className="rounded-xl border px-4 py-2.5 text-sm font-medium"
        >
          ✦ Generate with AI
        </Link>
      </div>

      <PracticeBuilderForm organizationId={selected.id} />
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { getOrganizationsForUser } from '@/modules/organization/repository';
import { generatePracticeAction } from '@/modules/practice/generation-actions';

type GeneratePracticePageProps = {
  searchParams: Promise<{ organization?: string }>;
};

export default async function GeneratePracticePage({
  searchParams,
}: GeneratePracticePageProps) {
  const user = await requireUser();
  const organizations = await getOrganizationsForUser(user.id);

  if (organizations.length === 0) redirect('/onboarding');

  const query = await searchParams;
  const selected =
    organizations.find((organization) => organization.id === query.organization) ??
    organizations[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full space-y-8">
        <div className="space-y-3">
          <Link
            href={`/dashboard/practices/new?organization=${selected.id}`}
            className="text-sm text-[var(--muted)]"
          >
            ← Manual builder
          </Link>
          <p className="text-sm font-medium text-[var(--muted)]">AI draft</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            What should someone practise?
          </h1>
          <p className="max-w-2xl text-[var(--muted)]">
            Describe the skill and situation in plain English. InterviewGrade will
            draft the scenario, questions and rubric. Nothing is published until
            you review it.
          </p>
        </div>

        <form action={generatePracticeAction} className="space-y-4">
          <input type="hidden" name="organizationId" value={selected.id} />
          <textarea
            name="prompt"
            required
            minLength={10}
            maxLength={4000}
            rows={7}
            autoFocus
            placeholder="Junior SaaS sales reps handling a prospect who likes the product but thinks the price is too high. Focus on discovery, objection handling, communication and value framing."
            className="w-full rounded-2xl border bg-transparent px-4 py-4 text-lg leading-7 outline-none focus:ring-2"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-5 py-3.5 font-medium text-[var(--accent-foreground)]"
          >
            Generate practice draft
          </button>
        </form>
      </div>
    </main>
  );
}

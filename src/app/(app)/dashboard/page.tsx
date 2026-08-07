import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { signOutAction } from '@/modules/auth/actions';
import { getOrganizationsForUser } from '@/modules/organization/repository';
import { listPracticesForOrganization } from '@/modules/practice/repository';
import { ensureProfile } from '@/modules/profile/repository';

type DashboardPageProps = {
  searchParams: Promise<{ organization?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  await ensureProfile(user.id);

  const organizations = await getOrganizationsForUser(user.id);
  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  const query = await searchParams;
  const selected =
    organizations.find((organization) => organization.id === query.organization) ??
    organizations[0];

  const practices = await listPracticesForOrganization(selected.id, user.id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <Link href="/" className="text-sm text-[var(--muted)]">
            InterviewGrade
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{selected.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/billing?organization=${selected.id}`}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Billing
          </Link>
          <Link
            href={`/dashboard/practices/new?organization=${selected.id}`}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            + New practice
          </Link>
          <form action={signOutAction}>
            <button className="rounded-lg border px-4 py-2 text-sm font-medium">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Practices</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create once, publish, then share the same practice with as many
              participants as you need.
            </p>
          </div>
        </div>

        {practices.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h3 className="font-medium">No practices yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Start with a real situation somebody should get better at handling.
            </p>
            <Link
              href={`/dashboard/practices/new?organization=${selected.id}`}
              className="mt-5 inline-block rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Create your first practice
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b bg-[var(--surface)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <span>Practice</span>
              <span>Status</span>
              <span>Updated</span>
            </div>
            {practices.map((practice) => (
              <Link
                key={practice.id}
                href={`/dashboard/practices/${practice.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-4 py-4 last:border-b-0 hover:bg-[var(--surface)]"
              >
                <div>
                  <p className="font-medium">{practice.title}</p>
                  {practice.description ? (
                    <p className="mt-1 max-w-xl truncate text-sm text-[var(--muted)]">
                      {practice.description}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs capitalize">
                  {practice.status}
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {practice.updatedAt.toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

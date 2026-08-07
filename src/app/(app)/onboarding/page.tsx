import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import { createWorkspaceAction } from '@/modules/organization/actions';
import { getOrganizationsForUser } from '@/modules/organization/repository';
import { ensureProfile } from '@/modules/profile/repository';

export default async function OnboardingPage() {
  const user = await requireUser();
  await ensureProfile(user.id);

  const organizations = await getOrganizationsForUser(user.id);
  if (organizations.length > 0) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">One quick setup step</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Name your workspace
          </h1>
          <p className="text-[var(--muted)]">
            A workspace owns practices and results. You can invite other people
            later; the MVP starts with you.
          </p>
        </div>

        <form action={createWorkspaceAction} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Workspace name</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={160}
              placeholder="e.g. Career Services"
              className="w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-[var(--accent-foreground)]"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}

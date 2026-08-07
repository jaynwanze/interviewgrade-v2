import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require-user';
import {
  openBillingPortalAction,
  startSubscriptionCheckoutAction,
} from '@/modules/billing/actions';
import { getOrganizationBilling } from '@/modules/billing/repository';
import { getOrganizationsForUser } from '@/modules/organization/repository';

type BillingPageProps = {
  searchParams: Promise<{
    organization?: string;
    checkout?: 'success' | 'cancelled';
  }>;
};

const paidStatuses = new Set(['active', 'trialing']);

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireUser();
  const organizations = await getOrganizationsForUser(user.id);
  if (organizations.length === 0) redirect('/onboarding');

  const query = await searchParams;
  const organization =
    organizations.find((item) => item.id === query.organization) ?? organizations[0];
  const billing = await getOrganizationBilling(organization.id, user.id);
  const canManage = ['owner', 'admin'].includes(organization.role);
  const isPaid = billing ? paidStatuses.has(billing.status) : false;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <div className="border-b pb-6">
        <Link
          href={`/dashboard?organization=${organization.id}`}
          className="text-sm text-[var(--muted)]"
        >
          ← {organization.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-2 text-[var(--muted)]">
          Manage the subscription for this organization. Product limits are not
          enforced yet; this establishes the billing system before packaging is
          finalized.
        </p>
      </div>

      {query.checkout === 'success' ? (
        <div className="mt-6 rounded-xl border p-4 text-sm">
          Checkout completed. Stripe will confirm the subscription through the
          signed webhook and this page will reflect the resulting status.
        </div>
      ) : null}

      {query.checkout === 'cancelled' ? (
        <div className="mt-6 rounded-xl border p-4 text-sm text-[var(--muted)]">
          Checkout was cancelled. Nothing changed.
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Subscription status</p>
            <p className="mt-1 text-2xl font-semibold capitalize">
              {billing?.status ?? 'Not subscribed'}
            </p>
            {billing?.stripePriceId ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Price: {billing.stripePriceId}
              </p>
            ) : null}
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {isPaid ? 'Paid' : 'No active plan'}
          </span>
        </div>

        {canManage ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {!isPaid ? (
              <form action={startSubscriptionCheckoutAction}>
                <input
                  type="hidden"
                  name="organizationId"
                  value={organization.id}
                />
                <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]">
                  Start subscription
                </button>
              </form>
            ) : null}

            {billing?.stripeCustomerId ? (
              <form action={openBillingPortalAction}>
                <input
                  type="hidden"
                  name="organizationId"
                  value={organization.id}
                />
                <button className="rounded-lg border px-4 py-2 text-sm font-medium">
                  Manage billing
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--muted)]">
            Only organization owners and admins can change billing.
          </p>
        )}
      </section>
    </main>
  );
}

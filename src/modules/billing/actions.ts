'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require-user';
import {
  getBillingStateByOrganizationId,
  requireOrganizationBillingAdmin,
  upsertStripeCustomer,
} from '@/modules/billing/repository';
import {
  createBillingPortalSession,
  createStripeCustomer,
  createSubscriptionCheckout,
} from '@/modules/billing/stripe';

const organizationSchema = z.object({
  organizationId: z.string().uuid(),
});

function parseOrganization(formData: FormData) {
  return organizationSchema.safeParse({
    organizationId: formData.get('organizationId'),
  });
}

export async function startSubscriptionCheckoutAction(formData: FormData) {
  const parsed = parseOrganization(formData);
  if (!parsed.success) redirect('/dashboard');

  const user = await requireUser();
  const { organizationId } = parsed.data;
  await requireOrganizationBillingAdmin(organizationId, user.id);

  let billing = await getBillingStateByOrganizationId(organizationId);
  if (!billing?.stripeCustomerId) {
    const customer = await createStripeCustomer({
      organizationId,
      email: user.email,
    });
    billing =
      (await upsertStripeCustomer({
        organizationId,
        stripeCustomerId: customer.id,
      })) ?? null;
  }

  if (!billing?.stripeCustomerId) {
    throw new Error('Unable to create a Stripe customer.');
  }

  const checkout = await createSubscriptionCheckout({
    organizationId,
    stripeCustomerId: billing.stripeCustomerId,
  });
  redirect(checkout.url);
}

export async function openBillingPortalAction(formData: FormData) {
  const parsed = parseOrganization(formData);
  if (!parsed.success) redirect('/dashboard');

  const user = await requireUser();
  const { organizationId } = parsed.data;
  await requireOrganizationBillingAdmin(organizationId, user.id);

  const billing = await getBillingStateByOrganizationId(organizationId);
  if (!billing?.stripeCustomerId) {
    redirect(`/dashboard/billing?organization=${organizationId}`);
  }

  const portal = await createBillingPortalSession({
    organizationId,
    stripeCustomerId: billing.stripeCustomerId,
  });
  redirect(portal.url);
}

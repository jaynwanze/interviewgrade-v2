import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizationSubscriptions } from '@/lib/db/billing-schema';
import { organizationMembers } from '@/lib/db/schema';
import { requireOrganizationMembership } from '@/modules/organization/repository';

export async function getOrganizationBilling(
  organizationId: string,
  userId: string,
) {
  await requireOrganizationMembership(organizationId, userId);

  const [billing] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  return billing ?? null;
}

export async function requireOrganizationBillingAdmin(
  organizationId: string,
  userId: string,
) {
  const [membership] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.memberId, userId),
      ),
    )
    .limit(1);

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only organization owners and admins can manage billing.');
  }

  return membership;
}

export async function getBillingStateByOrganizationId(organizationId: string) {
  const [billing] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  return billing ?? null;
}

export async function upsertStripeCustomer(input: {
  organizationId: string;
  stripeCustomerId: string;
}) {
  const [billing] = await db
    .insert(organizationSubscriptions)
    .values({
      organizationId: input.organizationId,
      stripeCustomerId: input.stripeCustomerId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizationSubscriptions.organizationId,
      set: {
        stripeCustomerId: input.stripeCustomerId,
        updatedAt: new Date(),
      },
    })
    .returning();

  return billing;
}

export async function upsertSubscriptionState(input: {
  organizationId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: string;
}) {
  const [billing] = await db
    .insert(organizationSubscriptions)
    .values({
      organizationId: input.organizationId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripePriceId: input.stripePriceId,
      status: input.status,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizationSubscriptions.organizationId,
      set: {
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripePriceId: input.stripePriceId,
        status: input.status,
        updatedAt: new Date(),
      },
    })
    .returning();

  return billing;
}

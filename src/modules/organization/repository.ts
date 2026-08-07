import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  organizationMembers,
  organizations,
} from '@/lib/db/schema';
import { ensureProfile } from '@/modules/profile/repository';

export async function getOrganizationsForUser(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizationMembers.role,
      createdAt: organizations.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.memberId, userId));
}

export async function createOrganizationForUser(
  userId: string,
  name: string,
) {
  await ensureProfile(userId);

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({ name, createdBy: userId })
      .returning();

    if (!organization) {
      throw new Error('Failed to create organization.');
    }

    await tx.insert(organizationMembers).values({
      organizationId: organization.id,
      memberId: userId,
      role: 'owner',
    });

    return organization;
  });
}

export async function requireOrganizationMembership(
  organizationId: string,
  userId: string,
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.memberId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error('You are not a member of this organization.');
  }

  return membership;
}

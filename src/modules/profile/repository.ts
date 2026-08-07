import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

export async function ensureProfile(userId: string, displayName?: string) {
  await db
    .insert(profiles)
    .values({ id: userId, displayName: displayName ?? null })
    .onConflictDoNothing({ target: profiles.id });

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!profile) {
    throw new Error('Failed to create or load profile.');
  }

  return profile;
}

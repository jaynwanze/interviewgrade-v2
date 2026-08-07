'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getOptionalUser } from '@/lib/auth/get-optional-user';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { startPracticeSession } from '@/modules/session/repository';

const startSchema = z.object({ slug: z.string().min(3).max(160) });

export async function startSessionAction(formData: FormData) {
  const parsed = startSchema.safeParse({ slug: formData.get('slug') });
  if (!parsed.success) redirect('/');

  const user = await getOptionalUser();
  const rateLimit = await consumeRateLimit({
    scope: 'session:create',
    limit: user ? 30 : 12,
    windowSeconds: 60 * 60,
    userId: user?.id ?? null,
  });

  if (!rateLimit.allowed) {
    redirect(`/p/${parsed.data.slug}?error=rate_limited`);
  }

  const session = await startPracticeSession(parsed.data.slug, user?.id ?? null);
  redirect(`/s/${session.id}`);
}

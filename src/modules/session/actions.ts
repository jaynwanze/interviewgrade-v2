'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getOptionalUser } from '@/lib/auth/get-optional-user';
import { startPracticeSession } from '@/modules/session/repository';

const startSchema = z.object({ slug: z.string().min(3).max(160) });

export async function startSessionAction(formData: FormData) {
  const parsed = startSchema.safeParse({ slug: formData.get('slug') });
  if (!parsed.success) redirect('/');

  const user = await getOptionalUser();
  const session = await startPracticeSession(parsed.data.slug, user?.id ?? null);
  redirect(`/s/${session.id}`);
}

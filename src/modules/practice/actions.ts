'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require-user';
import {
  createPracticeDraft,
  publishPractice,
} from '@/modules/practice/repository';
import { practiceDraftInputSchema } from '@/modules/practice/schemas';

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function createPracticeAction(formData: FormData) {
  const user = await requireUser();

  const estimatedRaw = formData.get('estimatedMinutes');
  const parsed = practiceDraftInputSchema.safeParse({
    organizationId: formData.get('organizationId'),
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    scenario: formData.get('scenario'),
    instructions: formData.get('instructions') || undefined,
    difficulty: formData.get('difficulty') || undefined,
    estimatedMinutes:
      typeof estimatedRaw === 'string' && estimatedRaw.length > 0
        ? Number(estimatedRaw)
        : undefined,
    questions: parseJson(formData.get('questionsJson')),
    rubricCriteria: parseJson(formData.get('rubricJson')),
  });

  if (!parsed.success) {
    redirect('/dashboard/practices/new?error=invalid_practice');
  }

  const practice = await createPracticeDraft(user.id, parsed.data);
  redirect(`/dashboard/practices/${practice.id}`);
}

const publishSchema = z.object({ practiceId: z.string().uuid() });

export async function publishPracticeAction(formData: FormData) {
  const user = await requireUser();
  const parsed = publishSchema.safeParse({ practiceId: formData.get('practiceId') });

  if (!parsed.success) {
    redirect('/dashboard');
  }

  await publishPractice(parsed.data.practiceId, user.id);
  redirect(`/dashboard/practices/${parsed.data.practiceId}?published=1`);
}

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require-user';
import { generatePracticeDraft } from '@/modules/practice/generator';
import { createPracticeDraft } from '@/modules/practice/repository';
import { practiceDraftInputSchema } from '@/modules/practice/schemas';

const generateRequestSchema = z.object({
  organizationId: z.string().uuid(),
  prompt: z.string().trim().min(10).max(4000),
});

export async function generatePracticeAction(formData: FormData) {
  const user = await requireUser();
  const request = generateRequestSchema.safeParse({
    organizationId: formData.get('organizationId'),
    prompt: formData.get('prompt'),
  });

  if (!request.success) {
    redirect('/dashboard/practices/new?error=invalid_generation_prompt');
  }

  const generated = await generatePracticeDraft(request.data.prompt);
  const input = practiceDraftInputSchema.parse({
    organizationId: request.data.organizationId,
    ...generated,
  });

  const practice = await createPracticeDraft(user.id, input);
  redirect(`/dashboard/practices/${practice.id}?generated=1`);
}

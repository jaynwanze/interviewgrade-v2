'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require-user';
import { consumeRateLimit } from '@/lib/security/rate-limit';
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

  const rateLimit = await consumeRateLimit({
    scope: 'practice:generate',
    limit: 12,
    windowSeconds: 60 * 60,
    userId: user.id,
  });

  if (!rateLimit.allowed) {
    redirect(
      `/dashboard/practices/generate?organization=${request.data.organizationId}&error=rate_limited`,
    );
  }

  const generated = await generatePracticeDraft(request.data.prompt);
  const input = practiceDraftInputSchema.parse({
    organizationId: request.data.organizationId,
    ...generated,
  });

  const practice = await createPracticeDraft(user.id, input);
  redirect(`/dashboard/practices/${practice.id}?generated=1`);
}

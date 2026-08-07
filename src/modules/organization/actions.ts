'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require-user';
import { createOrganizationForUser } from '@/modules/organization/repository';

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({ name: formData.get('name') });

  if (!parsed.success) {
    redirect('/onboarding?error=invalid_workspace');
  }

  const organization = await createOrganizationForUser(user.id, parsed.data.name);
  redirect(`/dashboard?organization=${organization.id}`);
}

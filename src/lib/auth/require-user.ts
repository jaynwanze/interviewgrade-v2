import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;
  const userId = typeof claims?.sub === 'string' ? claims.sub : null;
  const email = typeof claims?.email === 'string' ? claims.email : undefined;

  if (error || !userId) {
    redirect('/login');
  }

  return { id: userId, email };
}

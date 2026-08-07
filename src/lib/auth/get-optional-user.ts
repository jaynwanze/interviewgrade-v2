import { createClient } from '@/lib/supabase/server';

export async function getOptionalUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const id = typeof claims?.sub === 'string' ? claims.sub : null;

  if (error || !id) return null;

  return {
    id,
    email: typeof claims.email === 'string' ? claims.email : undefined,
  };
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { serverEnv } from '@/lib/env/server';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. The root proxy
            // refreshes auth cookies for requests that need them.
          }
        },
      },
    },
  );
}

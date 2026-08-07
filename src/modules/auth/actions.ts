'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { serverEnv } from '@/lib/env/server';
import { createClient } from '@/lib/supabase/server';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/login?error=invalid_input');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect('/login?error=invalid_credentials');
  }

  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/signup?error=invalid_input');
  }

  const supabase = await createClient();
  const emailRedirectTo = new URL(
    '/auth/callback?next=/onboarding',
    serverEnv.NEXT_PUBLIC_SITE_URL,
  ).toString();

  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo },
  });

  if (error) {
    redirect('/signup?error=signup_failed');
  }

  if (!data.session) {
    redirect('/login?message=check_email');
  }

  redirect('/onboarding');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

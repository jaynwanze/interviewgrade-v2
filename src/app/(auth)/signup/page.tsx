import Link from 'next/link';

import { signUpAction } from '@/modules/auth/actions';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-[var(--muted)]">
            ← InterviewGrade
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your workspace
          </h1>
          <p className="text-[var(--muted)]">
            Start building and sharing AI-powered practice exercises.
          </p>
        </div>

        <form action={signUpAction} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-[var(--accent-foreground)]"
          >
            Create account
          </button>
        </form>

        <p className="text-sm text-[var(--muted)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--foreground)]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

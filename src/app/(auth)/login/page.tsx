import Link from 'next/link';

import { loginAction } from '@/modules/auth/actions';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-[var(--muted)]">
            ← InterviewGrade
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-[var(--muted)]">
            Manage practices and review participant results.
          </p>
        </div>

        <form action={loginAction} className="space-y-4">
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
              autoComplete="current-password"
              required
              className="w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-[var(--accent-foreground)]"
          >
            Sign in
          </button>
        </form>

        <p className="text-sm text-[var(--muted)]">
          New here?{' '}
          <Link href="/signup" className="font-medium text-[var(--foreground)]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

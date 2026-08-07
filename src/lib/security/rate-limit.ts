import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/lib/db';

type ConsumeRateLimitInput = {
  scope: string;
  limit: number;
  windowSeconds: number;
  userId?: string | null;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function hashIdentity(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function getIdentity(userId?: string | null) {
  if (userId) return `user:${userId}`;

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || requestHeaders.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

export async function consumeRateLimit({
  scope,
  limit,
  windowSeconds,
  userId,
}: ConsumeRateLimitInput): Promise<RateLimitResult> {
  const identityHash = hashIdentity(await getIdentity(userId));
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStartedAt = new Date(windowStartMs);

  const result = await db.execute(sql`
    INSERT INTO rate_limit_buckets (
      scope,
      identifier_hash,
      window_started_at,
      hits,
      updated_at
    ) VALUES (
      ${scope},
      ${identityHash},
      ${windowStartedAt},
      1,
      now()
    )
    ON CONFLICT (scope, identifier_hash, window_started_at)
    DO UPDATE SET
      hits = rate_limit_buckets.hits + 1,
      updated_at = now()
    RETURNING hits
  `);

  const hits = Number(result[0]?.hits ?? 1);
  const remaining = Math.max(0, limit - hits);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartMs + windowMs - nowMs) / 1000),
  );

  if (hits > limit) {
    console.warn('Rate limit exceeded', { scope, hits, limit });
  }

  return {
    allowed: hits <= limit,
    limit,
    remaining,
    retryAfterSeconds,
  };
}

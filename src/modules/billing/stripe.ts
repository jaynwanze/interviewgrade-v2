import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { serverEnv } from '@/lib/env/server';

const stripeObjectSchema = z.object({
  id: z.string(),
});

const checkoutSessionSchema = z.object({
  id: z.string(),
  url: z.string().url().nullable(),
});

const portalSessionSchema = z.object({
  id: z.string(),
  url: z.string().url(),
});

const stripeErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
  }),
});

async function stripeRequest<T>(
  path: string,
  body: URLSearchParams,
  schema: z.ZodType<T>,
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serverEnv.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = stripeErrorSchema.safeParse(json);
    throw new Error(
      parsedError.success
        ? parsedError.data.error.message ?? 'Stripe request failed.'
        : 'Stripe request failed.',
    );
  }

  return schema.parse(json);
}

export async function createStripeCustomer(input: {
  email?: string;
  organizationId: string;
}) {
  const body = new URLSearchParams();
  if (input.email) body.set('email', input.email);
  body.set('metadata[organization_id]', input.organizationId);

  return stripeRequest('customers', body, stripeObjectSchema);
}

export async function createSubscriptionCheckout(input: {
  organizationId: string;
  stripeCustomerId: string;
}) {
  const siteUrl = serverEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const body = new URLSearchParams({
    mode: 'subscription',
    customer: input.stripeCustomerId,
    success_url: `${siteUrl}/dashboard/billing?organization=${input.organizationId}&checkout=success`,
    cancel_url: `${siteUrl}/dashboard/billing?organization=${input.organizationId}&checkout=cancelled`,
    client_reference_id: input.organizationId,
    'line_items[0][price]': serverEnv.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    'metadata[organization_id]': input.organizationId,
    'subscription_data[metadata][organization_id]': input.organizationId,
  });

  const session = await stripeRequest(
    'checkout/sessions',
    body,
    checkoutSessionSchema,
  );

  if (!session.url) throw new Error('Stripe did not return a checkout URL.');

  return {
    id: session.id,
    url: session.url,
  };
}

export async function createBillingPortalSession(input: {
  organizationId: string;
  stripeCustomerId: string;
}) {
  const siteUrl = serverEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const body = new URLSearchParams({
    customer: input.stripeCustomerId,
    return_url: `${siteUrl}/dashboard/billing?organization=${input.organizationId}`,
  });

  return stripeRequest('billing_portal/sessions', body, portalSessionSchema);
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
) {
  if (!signatureHeader) throw new Error('Missing Stripe signature.');

  const parts = signatureHeader.split(',');
  const timestamp = parts
    .map((part) => part.split('='))
    .find(([key]) => key === 't')?.[1];
  const signatures = parts
    .map((part) => part.split('='))
    .filter(([key, value]) => key === 'v1' && value)
    .map(([, value]) => value as string);

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header.');
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw new Error('Invalid Stripe signature timestamp.');
  }

  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (age > toleranceSeconds) throw new Error('Expired Stripe webhook signature.');

  const expected = createHmac('sha256', serverEnv.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  const valid = signatures.some((signature) => {
    try {
      const candidate = Buffer.from(signature, 'hex');
      return (
        candidate.length === expectedBuffer.length &&
        timingSafeEqual(candidate, expectedBuffer)
      );
    } catch {
      return false;
    }
  });

  if (!valid) throw new Error('Invalid Stripe webhook signature.');
}

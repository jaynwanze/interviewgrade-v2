import { z } from 'zod';

import {
  upsertStripeCustomer,
  upsertSubscriptionState,
} from '@/modules/billing/repository';
import { verifyStripeWebhookSignature } from '@/modules/billing/stripe';

export const runtime = 'nodejs';

const customerIdSchema = z.union([
  z.string(),
  z.object({ id: z.string() }).transform((value) => value.id),
]);

const checkoutCompletedSchema = z.object({
  type: z.literal('checkout.session.completed'),
  data: z.object({
    object: z.object({
      client_reference_id: z.string().nullable().optional(),
      customer: customerIdSchema.nullable().optional(),
      metadata: z.record(z.string(), z.string()).nullable().optional(),
    }),
  }),
});

const subscriptionEventSchema = z.object({
  type: z.enum([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: customerIdSchema.nullable().optional(),
      status: z.string(),
      metadata: z.record(z.string(), z.string()).nullable().optional(),
      items: z.object({
        data: z.array(
          z.object({
            price: z.object({ id: z.string() }),
          }),
        ),
      }),
    }),
  }),
});

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    verifyStripeWebhookSignature(
      rawBody,
      request.headers.get('stripe-signature'),
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  const checkout = checkoutCompletedSchema.safeParse(json);
  if (checkout.success) {
    const organizationId =
      checkout.data.data.object.metadata?.organization_id ??
      checkout.data.data.object.client_reference_id;
    const stripeCustomerId = checkout.data.data.object.customer;

    if (organizationId && stripeCustomerId) {
      await upsertStripeCustomer({ organizationId, stripeCustomerId });
    }

    return Response.json({ received: true });
  }

  const subscription = subscriptionEventSchema.safeParse(json);
  if (subscription.success) {
    const object = subscription.data.data.object;
    const organizationId = object.metadata?.organization_id;

    if (organizationId) {
      await upsertSubscriptionState({
        organizationId,
        stripeCustomerId: object.customer ?? null,
        stripeSubscriptionId: object.id,
        stripePriceId: object.items.data[0]?.price.id ?? null,
        status: object.status,
      });
    }

    return Response.json({ received: true });
  }

  return Response.json({ received: true, ignored: true });
}

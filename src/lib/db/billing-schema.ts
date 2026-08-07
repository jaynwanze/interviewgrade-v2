import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { organizations } from './schema';

export const organizationSubscriptions = pgTable(
  'organization_subscriptions',
  {
    organizationId: uuid('organization_id')
      .primaryKey()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    status: varchar('status', { length: 40 }).default('inactive').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('organization_subscriptions_customer_unique').on(
      table.stripeCustomerId,
    ),
    uniqueIndex('organization_subscriptions_subscription_unique').on(
      table.stripeSubscriptionId,
    ),
    index('organization_subscriptions_status_idx').on(table.status),
  ],
);

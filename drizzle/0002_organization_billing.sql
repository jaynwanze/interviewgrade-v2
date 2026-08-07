CREATE TABLE "organization_subscriptions" (
  "organization_id" uuid PRIMARY KEY NOT NULL,
  "stripe_customer_id" varchar(255),
  "stripe_subscription_id" varchar(255),
  "stripe_price_id" varchar(255),
  "status" varchar(40) DEFAULT 'inactive' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_subscriptions"
  ADD CONSTRAINT "organization_subscriptions_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_subscriptions_customer_unique"
  ON "organization_subscriptions" USING btree ("stripe_customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_subscriptions_subscription_unique"
  ON "organization_subscriptions" USING btree ("stripe_subscription_id");
--> statement-breakpoint
CREATE INDEX "organization_subscriptions_status_idx"
  ON "organization_subscriptions" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "organization_subscriptions" FROM anon;
--> statement-breakpoint
REVOKE ALL ON TABLE "organization_subscriptions" FROM authenticated;

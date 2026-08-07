CREATE TABLE "rate_limit_buckets" (
  "scope" varchar(80) NOT NULL,
  "identifier_hash" varchar(64) NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "hits" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "rate_limit_buckets_pk" PRIMARY KEY("scope", "identifier_hash", "window_started_at")
);

CREATE INDEX "rate_limit_buckets_updated_idx"
  ON "rate_limit_buckets" ("updated_at");

ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "rate_limit_buckets" FROM anon, authenticated;

-- InterviewGrade v2 does not use the Supabase Data API for business data.
-- Application persistence runs server-side through Drizzle/PostgreSQL.
--
-- Keep the public schema available for managed Postgres while preventing the
-- Supabase `anon` and `authenticated` API roles from receiving direct CRUD
-- access to business tables. RLS is enabled as an additional defence-in-depth
-- boundary; no Data API policies are intentionally created here.

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."practices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."practice_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."practice_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rubric_criteria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."question_rubric_criteria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."response_evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_evaluations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  "public"."profiles",
  "public"."organizations",
  "public"."organization_members",
  "public"."practices",
  "public"."practice_versions",
  "public"."practice_questions",
  "public"."rubric_criteria",
  "public"."question_rubric_criteria",
  "public"."sessions",
  "public"."responses",
  "public"."response_evaluations",
  "public"."session_evaluations"
FROM anon, authenticated;

-- Preserve the same posture for new Drizzle-created tables when migrations are
-- executed by the same database owner role.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

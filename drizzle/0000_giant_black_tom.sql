CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."practice_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."practice_version_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" "organization_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_member_id_pk" PRIMARY KEY("organization_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"prompt" text NOT NULL,
	"sample_answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "practice_version_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"scenario" text NOT NULL,
	"instructions" text,
	"difficulty" varchar(40),
	"estimated_minutes" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"slug" varchar(160) NOT NULL,
	"status" "practice_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_rubric_criteria" (
	"question_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	CONSTRAINT "question_rubric_criteria_question_id_criterion_id_pk" PRIMARY KEY("question_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE "response_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"criterion_scores" jsonb NOT NULL,
	"summary" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"improvements" jsonb NOT NULL,
	"next_step" text,
	"model" varchar(100) NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"transcript" text NOT NULL,
	"audio_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"weight" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"criterion_scores" jsonb NOT NULL,
	"strengths" jsonb NOT NULL,
	"improvements" jsonb NOT NULL,
	"recommendations" jsonb NOT NULL,
	"summary" text NOT NULL,
	"model" varchar(100),
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_version_id" uuid NOT NULL,
	"participant_user_id" uuid,
	"status" "session_status" DEFAULT 'in_progress' NOT NULL,
	"current_question_position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_member_id_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_practice_version_id_practice_versions_id_fk" FOREIGN KEY ("practice_version_id") REFERENCES "public"."practice_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_versions" ADD CONSTRAINT "practice_versions_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_rubric_criteria" ADD CONSTRAINT "question_rubric_criteria_question_id_practice_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."practice_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_rubric_criteria" ADD CONSTRAINT "question_rubric_criteria_criterion_id_rubric_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_evaluations" ADD CONSTRAINT "response_evaluations_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_practice_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."practice_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_practice_version_id_practice_versions_id_fk" FOREIGN KEY ("practice_version_id") REFERENCES "public"."practice_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_practice_version_id_practice_versions_id_fk" FOREIGN KEY ("practice_version_id") REFERENCES "public"."practice_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_members_member_idx" ON "organization_members" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_questions_version_position_unique" ON "practice_questions" USING btree ("practice_version_id","position");--> statement-breakpoint
CREATE INDEX "practice_questions_version_idx" ON "practice_questions" USING btree ("practice_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_versions_practice_version_unique" ON "practice_versions" USING btree ("practice_id","version_number");--> statement-breakpoint
CREATE INDEX "practice_versions_practice_idx" ON "practice_versions" USING btree ("practice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practices_slug_unique" ON "practices" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "practices_organization_idx" ON "practices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "response_evaluations_response_unique" ON "response_evaluations" USING btree ("response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_attempt_unique" ON "responses" USING btree ("session_id","question_id","attempt_number");--> statement-breakpoint
CREATE INDEX "responses_session_idx" ON "responses" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_criteria_version_position_unique" ON "rubric_criteria" USING btree ("practice_version_id","position");--> statement-breakpoint
CREATE INDEX "rubric_criteria_version_idx" ON "rubric_criteria" USING btree ("practice_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_evaluations_session_unique" ON "session_evaluations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_practice_version_idx" ON "sessions" USING btree ("practice_version_id");--> statement-breakpoint
CREATE INDEX "sessions_participant_idx" ON "sessions" USING btree ("participant_user_id");
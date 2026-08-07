import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const organizationRoleEnum = pgEnum('organization_role', [
  'owner',
  'admin',
  'member',
]);

export const practiceStatusEnum = pgEnum('practice_status', [
  'draft',
  'published',
  'archived',
]);

export const practiceVersionStatusEnum = pgEnum('practice_version_status', [
  'draft',
  'published',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'in_progress',
  'completed',
  'abandoned',
]);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: varchar('display_name', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizationMembers = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: organizationRoleEnum('role').default('member').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.memberId] }),
    index('organization_members_member_idx').on(table.memberId),
  ],
);

export const practices = pgTable(
  'practices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 160 }).notNull(),
    status: practiceStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('practices_slug_unique').on(table.slug),
    index('practices_organization_idx').on(table.organizationId),
  ],
);

export const practiceVersions = pgTable(
  'practice_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    practiceId: uuid('practice_id')
      .notNull()
      .references(() => practices.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: practiceVersionStatusEnum('status').default('draft').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    scenario: text('scenario').notNull(),
    instructions: text('instructions'),
    difficulty: varchar('difficulty', { length: 40 }),
    estimatedMinutes: integer('estimated_minutes'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('practice_versions_practice_version_unique').on(
      table.practiceId,
      table.versionNumber,
    ),
    index('practice_versions_practice_idx').on(table.practiceId),
  ],
);

export const practiceQuestions = pgTable(
  'practice_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    practiceVersionId: uuid('practice_version_id')
      .notNull()
      .references(() => practiceVersions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    prompt: text('prompt').notNull(),
    sampleAnswer: text('sample_answer'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('practice_questions_version_position_unique').on(
      table.practiceVersionId,
      table.position,
    ),
    index('practice_questions_version_idx').on(table.practiceVersionId),
  ],
);

export const rubricCriteria = pgTable(
  'rubric_criteria',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    practiceVersionId: uuid('practice_version_id')
      .notNull()
      .references(() => practiceVersions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull(),
    weight: integer('weight').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('rubric_criteria_version_position_unique').on(
      table.practiceVersionId,
      table.position,
    ),
    index('rubric_criteria_version_idx').on(table.practiceVersionId),
  ],
);

export const questionRubricCriteria = pgTable(
  'question_rubric_criteria',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => practiceQuestions.id, { onDelete: 'cascade' }),
    criterionId: uuid('criterion_id')
      .notNull()
      .references(() => rubricCriteria.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.criterionId] })],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    practiceVersionId: uuid('practice_version_id')
      .notNull()
      .references(() => practiceVersions.id, { onDelete: 'restrict' }),
    participantUserId: uuid('participant_user_id'),
    status: sessionStatusEnum('status').default('in_progress').notNull(),
    currentQuestionPosition: integer('current_question_position')
      .default(0)
      .notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('sessions_practice_version_idx').on(table.practiceVersionId),
    index('sessions_participant_idx').on(table.participantUserId),
  ],
);

export const responses = pgTable(
  'responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => practiceQuestions.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').default(1).notNull(),
    transcript: text('transcript').notNull(),
    audioPath: text('audio_path'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('responses_attempt_unique').on(
      table.sessionId,
      table.questionId,
      table.attemptNumber,
    ),
    index('responses_session_idx').on(table.sessionId),
  ],
);

export const responseEvaluations = pgTable(
  'response_evaluations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    responseId: uuid('response_id')
      .notNull()
      .references(() => responses.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    criterionScores: jsonb('criterion_scores')
      .$type<Record<string, number>>()
      .notNull(),
    summary: text('summary').notNull(),
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    improvements: jsonb('improvements').$type<string[]>().notNull(),
    nextStep: text('next_step'),
    model: varchar('model', { length: 100 }).notNull(),
    schemaVersion: integer('schema_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('response_evaluations_response_unique').on(table.responseId)],
);

export const sessionEvaluations = pgTable(
  'session_evaluations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    overallScore: integer('overall_score').notNull(),
    criterionScores: jsonb('criterion_scores')
      .$type<Record<string, number>>()
      .notNull(),
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    improvements: jsonb('improvements').$type<string[]>().notNull(),
    recommendations: jsonb('recommendations').$type<string[]>().notNull(),
    summary: text('summary').notNull(),
    model: varchar('model', { length: 100 }),
    schemaVersion: integer('schema_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('session_evaluations_session_unique').on(table.sessionId)],
);

export type Profile = typeof profiles.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Practice = typeof practices.$inferSelect;
export type PracticeVersion = typeof practiceVersions.$inferSelect;
export type PracticeQuestion = typeof practiceQuestions.$inferSelect;
export type RubricCriterion = typeof rubricCriteria.$inferSelect;
export type PracticeSession = typeof sessions.$inferSelect;
export type PracticeResponse = typeof responses.$inferSelect;

import { randomUUID } from 'crypto';

import { and, desc, eq, max } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  practiceQuestions,
  practiceVersions,
  practices,
  questionRubricCriteria,
  rubricCriteria,
} from '@/lib/db/schema';
import { requireOrganizationMembership } from '@/modules/organization/repository';
import type { PracticeDraftInput } from './schemas';

function slugifyTitle(title: string) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return `${base || 'practice'}-${randomUUID().slice(0, 8)}`;
}

export async function createPracticeDraft(
  userId: string,
  input: PracticeDraftInput,
) {
  await requireOrganizationMembership(input.organizationId, userId);

  return db.transaction(async (tx) => {
    const [practice] = await tx
      .insert(practices)
      .values({
        organizationId: input.organizationId,
        createdBy: userId,
        slug: slugifyTitle(input.title),
        status: 'draft',
      })
      .returning();

    if (!practice) {
      throw new Error('Failed to create practice.');
    }

    const [draftVersion] = await tx
      .insert(practiceVersions)
      .values({
        practiceId: practice.id,
        versionNumber: 0,
        status: 'draft',
        title: input.title,
        description: input.description ?? null,
        scenario: input.scenario,
        instructions: input.instructions ?? null,
        difficulty: input.difficulty ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
      })
      .returning();

    if (!draftVersion) {
      throw new Error('Failed to create practice draft version.');
    }

    const createdQuestions = await tx
      .insert(practiceQuestions)
      .values(
        input.questions.map((question, index) => ({
          practiceVersionId: draftVersion.id,
          position: index,
          prompt: question.prompt,
          sampleAnswer: question.sampleAnswer || null,
        })),
      )
      .returning({ id: practiceQuestions.id });

    const createdCriteria = await tx
      .insert(rubricCriteria)
      .values(
        input.rubricCriteria.map((criterion, index) => ({
          practiceVersionId: draftVersion.id,
          position: index,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
        })),
      )
      .returning({ id: rubricCriteria.id });

    await tx.insert(questionRubricCriteria).values(
      createdQuestions.flatMap((question) =>
        createdCriteria.map((criterion) => ({
          questionId: question.id,
          criterionId: criterion.id,
        })),
      ),
    );

    return practice;
  });
}

export async function listPracticesForOrganization(
  organizationId: string,
  userId: string,
) {
  await requireOrganizationMembership(organizationId, userId);

  return db
    .select({
      id: practices.id,
      slug: practices.slug,
      status: practices.status,
      updatedAt: practices.updatedAt,
      title: practiceVersions.title,
      description: practiceVersions.description,
    })
    .from(practices)
    .innerJoin(
      practiceVersions,
      and(
        eq(practiceVersions.practiceId, practices.id),
        eq(practiceVersions.versionNumber, 0),
      ),
    )
    .where(eq(practices.organizationId, organizationId))
    .orderBy(desc(practices.updatedAt));
}

export async function getPracticeDraft(
  practiceId: string,
  userId: string,
) {
  const [practice] = await db
    .select()
    .from(practices)
    .where(eq(practices.id, practiceId))
    .limit(1);

  if (!practice) {
    return null;
  }

  await requireOrganizationMembership(practice.organizationId, userId);

  const [version] = await db
    .select()
    .from(practiceVersions)
    .where(
      and(
        eq(practiceVersions.practiceId, practiceId),
        eq(practiceVersions.versionNumber, 0),
      ),
    )
    .limit(1);

  if (!version) {
    return null;
  }

  const [questions, criteria, mappings] = await Promise.all([
    db
      .select()
      .from(practiceQuestions)
      .where(eq(practiceQuestions.practiceVersionId, version.id))
      .orderBy(practiceQuestions.position),
    db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.practiceVersionId, version.id))
      .orderBy(rubricCriteria.position),
    db
      .select()
      .from(questionRubricCriteria)
      .innerJoin(
        practiceQuestions,
        eq(questionRubricCriteria.questionId, practiceQuestions.id),
      )
      .where(eq(practiceQuestions.practiceVersionId, version.id)),
  ]);

  return { practice, version, questions, criteria, mappings };
}

export async function publishPractice(practiceId: string, userId: string) {
  const draft = await getPracticeDraft(practiceId, userId);
  if (!draft) {
    throw new Error('Practice draft not found.');
  }

  if (draft.questions.length === 0 || draft.criteria.length === 0) {
    throw new Error('A practice needs questions and rubric criteria before publishing.');
  }

  const totalWeight = draft.criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  if (totalWeight !== 100) {
    throw new Error('Rubric weights must total 100 before publishing.');
  }

  return db.transaction(async (tx) => {
    const [versionResult] = await tx
      .select({ maxVersion: max(practiceVersions.versionNumber) })
      .from(practiceVersions)
      .where(eq(practiceVersions.practiceId, practiceId));

    const nextVersion = (versionResult?.maxVersion ?? 0) + 1;

    const [publishedVersion] = await tx
      .insert(practiceVersions)
      .values({
        practiceId,
        versionNumber: nextVersion,
        status: 'published',
        title: draft.version.title,
        description: draft.version.description,
        scenario: draft.version.scenario,
        instructions: draft.version.instructions,
        difficulty: draft.version.difficulty,
        estimatedMinutes: draft.version.estimatedMinutes,
        publishedAt: new Date(),
      })
      .returning();

    if (!publishedVersion) {
      throw new Error('Failed to publish practice version.');
    }

    const oldToNewQuestion = new Map<string, string>();
    const oldToNewCriterion = new Map<string, string>();

    for (const question of draft.questions) {
      const [created] = await tx
        .insert(practiceQuestions)
        .values({
          practiceVersionId: publishedVersion.id,
          position: question.position,
          prompt: question.prompt,
          sampleAnswer: question.sampleAnswer,
        })
        .returning({ id: practiceQuestions.id });

      if (created) oldToNewQuestion.set(question.id, created.id);
    }

    for (const criterion of draft.criteria) {
      const [created] = await tx
        .insert(rubricCriteria)
        .values({
          practiceVersionId: publishedVersion.id,
          position: criterion.position,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
        })
        .returning({ id: rubricCriteria.id });

      if (created) oldToNewCriterion.set(criterion.id, created.id);
    }

    const mappingRows = draft.mappings.flatMap((row) => {
      const questionId = oldToNewQuestion.get(row.question_rubric_criteria.questionId);
      const criterionId = oldToNewCriterion.get(row.question_rubric_criteria.criterionId);
      return questionId && criterionId ? [{ questionId, criterionId }] : [];
    });

    if (mappingRows.length > 0) {
      await tx.insert(questionRubricCriteria).values(mappingRows);
    }

    await tx
      .update(practices)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(practices.id, practiceId));

    return publishedVersion;
  });
}

export async function getPublishedPracticeBySlug(slug: string) {
  const [result] = await db
    .select({
      practice: practices,
      version: practiceVersions,
    })
    .from(practices)
    .innerJoin(
      practiceVersions,
      and(
        eq(practiceVersions.practiceId, practices.id),
        eq(practiceVersions.status, 'published'),
      ),
    )
    .where(and(eq(practices.slug, slug), eq(practices.status, 'published')))
    .orderBy(desc(practiceVersions.versionNumber))
    .limit(1);

  if (!result) return null;

  const [questions, criteria] = await Promise.all([
    db
      .select()
      .from(practiceQuestions)
      .where(eq(practiceQuestions.practiceVersionId, result.version.id))
      .orderBy(practiceQuestions.position),
    db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.practiceVersionId, result.version.id))
      .orderBy(rubricCriteria.position),
  ]);

  return { ...result, questions, criteria };
}

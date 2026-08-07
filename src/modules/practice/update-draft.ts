import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  practiceQuestions,
  practiceVersions,
  practices,
  questionRubricCriteria,
  rubricCriteria,
} from '@/lib/db/schema';
import { getPracticeDraft } from '@/modules/practice/repository';
import type { PracticeDraftInput } from '@/modules/practice/schemas';

export async function updatePracticeDraft(
  practiceId: string,
  userId: string,
  input: PracticeDraftInput,
) {
  const existing = await getPracticeDraft(practiceId, userId);
  if (!existing) throw new Error('Practice draft not found.');

  if (existing.practice.organizationId !== input.organizationId) {
    throw new Error('A practice cannot be moved between workspaces by this action.');
  }

  return db.transaction(async (tx) => {
    await tx
      .update(practiceVersions)
      .set({
        title: input.title,
        description: input.description ?? null,
        scenario: input.scenario,
        instructions: input.instructions ?? null,
        difficulty: input.difficulty ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(practiceVersions.id, existing.version.id));

    // Questions and criteria are draft authoring data. Replacing them is simpler
    // and safer than trying to diff nested arrays. Published versions are separate
    // immutable rows and are never touched here.
    await tx
      .delete(practiceQuestions)
      .where(eq(practiceQuestions.practiceVersionId, existing.version.id));
    await tx
      .delete(rubricCriteria)
      .where(eq(rubricCriteria.practiceVersionId, existing.version.id));

    const createdQuestions = await tx
      .insert(practiceQuestions)
      .values(
        input.questions.map((question, index) => ({
          practiceVersionId: existing.version.id,
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
          practiceVersionId: existing.version.id,
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

    const [practice] = await tx
      .update(practices)
      .set({ updatedAt: new Date() })
      .where(eq(practices.id, practiceId))
      .returning();

    if (!practice) throw new Error('Failed to update practice.');
    return practice;
  });
}

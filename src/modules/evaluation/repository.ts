import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  practiceQuestions,
  practiceVersions,
  questionRubricCriteria,
  responseEvaluations,
  responses,
  rubricCriteria,
  sessions,
} from '@/lib/db/schema';

export async function getResponseEvaluationContext(responseId: string) {
  const [row] = await db
    .select({
      response: responses,
      question: practiceQuestions,
      session: sessions,
      version: practiceVersions,
    })
    .from(responses)
    .innerJoin(practiceQuestions, eq(responses.questionId, practiceQuestions.id))
    .innerJoin(sessions, eq(responses.sessionId, sessions.id))
    .innerJoin(
      practiceVersions,
      eq(sessions.practiceVersionId, practiceVersions.id),
    )
    .where(eq(responses.id, responseId))
    .limit(1);

  if (!row) return null;

  const criteria = await db
    .select({
      id: rubricCriteria.id,
      name: rubricCriteria.name,
      description: rubricCriteria.description,
      weight: rubricCriteria.weight,
      position: rubricCriteria.position,
    })
    .from(questionRubricCriteria)
    .innerJoin(
      rubricCriteria,
      eq(questionRubricCriteria.criterionId, rubricCriteria.id),
    )
    .where(eq(questionRubricCriteria.questionId, row.question.id));

  return { ...row, criteria };
}

export async function saveResponseEvaluation(input: {
  responseId: string;
  score: number;
  criterionScores: Record<string, number>;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
  model: string;
}) {
  const values = {
    responseId: input.responseId,
    score: input.score,
    criterionScores: input.criterionScores,
    summary: input.summary,
    strengths: input.strengths,
    improvements: input.improvements,
    nextStep: input.nextStep,
    model: input.model,
    schemaVersion: 1,
  };

  const [evaluation] = await db
    .insert(responseEvaluations)
    .values(values)
    .onConflictDoUpdate({
      target: responseEvaluations.responseId,
      set: values,
    })
    .returning();

  if (!evaluation) throw new Error('Failed to persist response evaluation.');
  return evaluation;
}

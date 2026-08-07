import { z } from 'zod';

import { openai } from '@/lib/ai/openai';
import { db } from '@/lib/db';
import { sessionEvaluations, sessions } from '@/lib/db/schema';
import { serverEnv } from '@/lib/env/server';
import { getSessionPlayerState } from '@/modules/session/repository';
import { eq } from 'drizzle-orm';

const synthesisSchema = z.object({
  strengths: z.array(z.string().min(1).max(500)).max(6),
  improvements: z.array(z.string().min(1).max(500)).max(6),
  recommendations: z.array(z.string().min(1).max(500)).max(6),
  summary: z.string().min(1).max(2500),
});

function getLatestEvaluatedAttempts(
  attempts: NonNullable<Awaited<ReturnType<typeof getSessionPlayerState>>>['attempts'],
) {
  const latest = new Map<string, (typeof attempts)[number]>();

  for (const attempt of attempts) {
    if (!attempt.evaluation) continue;

    const current = latest.get(attempt.response.questionId);
    if (
      !current ||
      attempt.response.attemptNumber > current.response.attemptNumber
    ) {
      latest.set(attempt.response.questionId, attempt);
    }
  }

  return latest;
}

export async function finalizeSession(sessionId: string) {
  const state = await getSessionPlayerState(sessionId);
  if (!state) throw new Error('Session not found.');

  if (state.finalEvaluation) {
    return state.finalEvaluation;
  }

  const latest = getLatestEvaluatedAttempts(state.attempts);
  if (latest.size !== state.questions.length) {
    throw new Error('Every question must have an evaluated response before completion.');
  }

  const criterionAccumulator = new Map<
    string,
    { sum: number; count: number; name: string; weight: number }
  >();

  for (const criterion of state.criteria) {
    criterionAccumulator.set(criterion.id, {
      sum: 0,
      count: 0,
      name: criterion.name,
      weight: criterion.weight,
    });
  }

  for (const attempt of latest.values()) {
    const scores = attempt.evaluation?.criterionScores ?? {};

    for (const [criterionId, score] of Object.entries(scores)) {
      const accumulator = criterionAccumulator.get(criterionId);
      if (!accumulator || typeof score !== 'number') continue;
      accumulator.sum += score;
      accumulator.count += 1;
    }
  }

  const criterionScores = Object.fromEntries(
    [...criterionAccumulator.entries()].map(([criterionId, accumulator]) => [
      criterionId,
      accumulator.count > 0
        ? Math.round(accumulator.sum / accumulator.count)
        : 0,
    ]),
  );

  const totalWeight = state.criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );

  if (totalWeight <= 0) {
    throw new Error('Rubric weights are invalid.');
  }

  const overallScore = Math.round(
    state.criteria.reduce(
      (sum, criterion) =>
        sum + (criterionScores[criterion.id] ?? 0) * criterion.weight,
      0,
    ) / totalWeight,
  );

  const latestAttemptsForPrompt = state.questions.map((question) => {
    const attempt = latest.get(question.id);
    if (!attempt?.evaluation) {
      throw new Error('Missing evaluated response.');
    }

    return {
      question: question.prompt,
      transcript: attempt.response.transcript,
      score: attempt.evaluation.score,
      summary: attempt.evaluation.summary,
      strengths: attempt.evaluation.strengths,
      improvements: attempt.evaluation.improvements,
    };
  });

  const response = await openai.responses.create({
    model: serverEnv.OPENAI_EVALUATION_MODEL,
    instructions: [
      'You are writing the final coaching summary for a completed practice exercise.',
      'Use only the supplied evaluated responses and deterministic scores.',
      'Do not recalculate or contradict the numeric scores.',
      'Be concise, specific, constructive, and useful for the next attempt.',
      'Do not infer personality, emotions, protected traits, or employability.',
    ].join(' '),
    input: JSON.stringify({
      practiceTitle: state.version.title,
      scenario: state.version.scenario,
      overallScore,
      criterionScores: state.criteria.map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        score: criterionScores[criterion.id] ?? 0,
      })),
      responses: latestAttemptsForPrompt,
    }),
    text: {
      format: {
        type: 'json_schema',
        name: 'session_synthesis',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            strengths: {
              type: 'array',
              maxItems: 6,
              items: { type: 'string' },
            },
            improvements: {
              type: 'array',
              maxItems: 6,
              items: { type: 'string' },
            },
            recommendations: {
              type: 'array',
              maxItems: 6,
              items: { type: 'string' },
            },
            summary: { type: 'string' },
          },
          required: [
            'strengths',
            'improvements',
            'recommendations',
            'summary',
          ],
        },
      },
    },
  });

  if (!response.output_text) {
    throw new Error('The model returned an empty final synthesis.');
  }

  const synthesis = synthesisSchema.parse(JSON.parse(response.output_text));

  return db.transaction(async (tx) => {
    const [evaluation] = await tx
      .insert(sessionEvaluations)
      .values({
        sessionId,
        overallScore,
        criterionScores,
        strengths: synthesis.strengths,
        improvements: synthesis.improvements,
        recommendations: synthesis.recommendations,
        summary: synthesis.summary,
        model: serverEnv.OPENAI_EVALUATION_MODEL,
        schemaVersion: 1,
      })
      .onConflictDoUpdate({
        target: sessionEvaluations.sessionId,
        set: {
          overallScore,
          criterionScores,
          strengths: synthesis.strengths,
          improvements: synthesis.improvements,
          recommendations: synthesis.recommendations,
          summary: synthesis.summary,
          model: serverEnv.OPENAI_EVALUATION_MODEL,
          schemaVersion: 1,
        },
      })
      .returning();

    if (!evaluation) {
      throw new Error('Failed to save final evaluation.');
    }

    await tx
      .update(sessions)
      .set({
        status: 'completed',
        currentQuestionPosition: state.questions.length,
        completedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    return evaluation;
  });
}

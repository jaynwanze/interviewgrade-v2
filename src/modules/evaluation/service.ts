import { openai } from '@/lib/ai/openai';
import { serverEnv } from '@/lib/env/server';
import {
  getResponseEvaluationContext,
  saveResponseEvaluation,
} from '@/modules/evaluation/repository';
import { responseEvaluationModelSchema } from '@/modules/evaluation/schemas';

export async function evaluateResponse(responseId: string) {
  const context = await getResponseEvaluationContext(responseId);
  if (!context) throw new Error('Response not found.');
  if (context.criteria.length === 0) {
    throw new Error('No rubric criteria are mapped to this question.');
  }

  const criterionIds = context.criteria.map((criterion) => criterion.id);

  const response = await openai.responses.create({
    model: serverEnv.OPENAI_EVALUATION_MODEL,
    instructions: [
      'You are evaluating a learner response to a professional practice exercise.',
      'Judge only evidence in the transcript against the supplied rubric.',
      'Do not infer personality, emotion, protected traits, or employability.',
      'Scores are 0-100 for each criterion. Be demanding but constructive.',
      'Feedback must be specific, actionable, and tied to what the learner actually said.',
    ].join(' '),
    input: JSON.stringify({
      scenario: context.version.scenario,
      question: context.question.prompt,
      learnerResponse: context.response.transcript,
      rubric: context.criteria.map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
      })),
    }),
    text: {
      format: {
        type: 'json_schema',
        name: 'response_evaluation',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            criterionScores: {
              type: 'array',
              minItems: criterionIds.length,
              maxItems: criterionIds.length,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  criterionId: { type: 'string', enum: criterionIds },
                  score: { type: 'integer', minimum: 0, maximum: 100 },
                  feedback: { type: 'string' },
                },
                required: ['criterionId', 'score', 'feedback'],
              },
            },
            summary: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            improvements: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            nextStep: { type: 'string' },
          },
          required: [
            'criterionScores',
            'summary',
            'strengths',
            'improvements',
            'nextStep',
          ],
        },
      },
    },
  });

  if (!response.output_text) {
    throw new Error('The model returned an empty evaluation.');
  }

  const output = responseEvaluationModelSchema.parse(
    JSON.parse(response.output_text),
  );

  const expectedIds = new Set(criterionIds);
  const returnedIds = new Set(output.criterionScores.map((item) => item.criterionId));
  if (
    returnedIds.size !== expectedIds.size ||
    [...expectedIds].some((id) => !returnedIds.has(id))
  ) {
    throw new Error('Evaluation returned an invalid criterion set.');
  }

  const scoreByCriterion = new Map(
    output.criterionScores.map((item) => [item.criterionId, item.score]),
  );
  const totalWeight = context.criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  const weightedScore = Math.round(
    context.criteria.reduce(
      (sum, criterion) =>
        sum + (scoreByCriterion.get(criterion.id) ?? 0) * criterion.weight,
      0,
    ) / totalWeight,
  );

  await saveResponseEvaluation({
    responseId,
    score: weightedScore,
    criterionScores: Object.fromEntries(
      output.criterionScores.map((item) => [item.criterionId, item.score]),
    ),
    summary: output.summary,
    strengths: output.strengths,
    improvements: output.improvements,
    nextStep: output.nextStep,
    model: serverEnv.OPENAI_EVALUATION_MODEL,
  });

  return {
    score: weightedScore,
    ...output,
  };
}

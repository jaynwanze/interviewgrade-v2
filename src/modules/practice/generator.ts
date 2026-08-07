import { z } from 'zod';

import { openai } from '@/lib/ai/openai';
import { serverEnv } from '@/lib/env/server';

const generatedPracticeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000),
  scenario: z.string().min(20).max(10000),
  instructions: z.string().max(5000),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  estimatedMinutes: z.number().int().min(1).max(180),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(5).max(2000),
        sampleAnswer: z.string().max(5000),
      }),
    )
    .min(1)
    .max(10),
  rubricCriteria: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        description: z.string().min(5).max(2000),
        importance: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(8),
});

function normalizeWeights(importances: number[]) {
  const total = importances.reduce((sum, value) => sum + value, 0);
  const raw = importances.map((value) => (value / total) * 100);
  const rounded = raw.map((value) => Math.floor(value));
  let remainder = 100 - rounded.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const item of order) {
    if (remainder <= 0) break;
    rounded[item.index] += 1;
    remainder -= 1;
  }

  return rounded;
}

const responseFormat = {
  type: 'json_schema' as const,
  name: 'practice_draft',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      scenario: { type: 'string' },
      instructions: { type: 'string' },
      difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
      estimatedMinutes: { type: 'integer', minimum: 1, maximum: 180 },
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            prompt: { type: 'string' },
            sampleAnswer: { type: 'string' },
          },
          required: ['prompt', 'sampleAnswer'],
        },
      },
      rubricCriteria: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            importance: { type: 'integer', minimum: 1, maximum: 10 },
          },
          required: ['name', 'description', 'importance'],
        },
      },
    },
    required: [
      'title',
      'description',
      'scenario',
      'instructions',
      'difficulty',
      'estimatedMinutes',
      'questions',
      'rubricCriteria',
    ],
  },
};

export async function generatePracticeDraft(prompt: string) {
  const response = await openai.responses.create({
    model: serverEnv.OPENAI_GENERATION_MODEL,
    instructions: [
      'You design realistic speaking-practice exercises for professional learning.',
      'Create a focused exercise that can be completed in one short session.',
      'Questions should require natural spoken answers, not trivia.',
      'Rubric criteria must be observable from the answer and useful to a coach.',
      'Do not make claims about personality, emotion, employability, or protected traits.',
    ].join(' '),
    input: prompt,
    text: { format: responseFormat },
  });

  if (!response.output_text) {
    throw new Error('The model returned an empty practice draft.');
  }

  const generated = generatedPracticeSchema.parse(JSON.parse(response.output_text));
  const weights = normalizeWeights(
    generated.rubricCriteria.map((criterion) => criterion.importance),
  );

  return {
    title: generated.title,
    description: generated.description,
    scenario: generated.scenario,
    instructions: generated.instructions,
    difficulty: generated.difficulty,
    estimatedMinutes: generated.estimatedMinutes,
    questions: generated.questions,
    rubricCriteria: generated.rubricCriteria.map((criterion, index) => ({
      name: criterion.name,
      description: criterion.description,
      weight: weights[index],
    })),
  };
}

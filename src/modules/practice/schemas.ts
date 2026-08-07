import { z } from 'zod';

export const practiceQuestionInputSchema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  sampleAnswer: z.string().trim().max(5000).optional(),
});

export const rubricCriterionInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  weight: z.number().int().min(1).max(100),
});

export const practiceDraftInputSchema = z
  .object({
    organizationId: z.string().uuid(),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
    scenario: z.string().trim().min(20).max(10000),
    instructions: z.string().trim().max(5000).optional(),
    difficulty: z.string().trim().max(40).optional(),
    estimatedMinutes: z.number().int().min(1).max(180).optional(),
    questions: z.array(practiceQuestionInputSchema).min(1).max(25),
    rubricCriteria: z.array(rubricCriterionInputSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    const totalWeight = value.rubricCriteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );

    if (totalWeight !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['rubricCriteria'],
        message: `Rubric weights must total 100. Current total: ${totalWeight}.`,
      });
    }
  });

export type PracticeDraftInput = z.infer<typeof practiceDraftInputSchema>;

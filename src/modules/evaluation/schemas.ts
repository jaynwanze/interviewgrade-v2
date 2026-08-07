import { z } from 'zod';

export const criterionEvaluationSchema = z.object({
  criterionId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1).max(2000),
});

export const responseEvaluationModelSchema = z.object({
  criterionScores: z.array(criterionEvaluationSchema).min(1).max(20),
  summary: z.string().min(1).max(2000),
  strengths: z.array(z.string().min(1).max(500)).max(5),
  improvements: z.array(z.string().min(1).max(500)).max(5),
  nextStep: z.string().min(1).max(1000),
});

export type ResponseEvaluationModelOutput = z.infer<
  typeof responseEvaluationModelSchema
>;

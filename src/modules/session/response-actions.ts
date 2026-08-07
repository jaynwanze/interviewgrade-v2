'use server';

import { z } from 'zod';

import { evaluateResponse } from '@/modules/evaluation/service';
import { finalizeSession } from '@/modules/session/final-evaluation';
import {
  advanceSession,
  createResponseAttempt,
  getSessionPlayerState,
} from '@/modules/session/repository';

const responseInputSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  transcript: z.string().trim().min(1).max(20000),
});

export async function submitResponseAction(input: unknown) {
  const parsed = responseInputSchema.parse(input);
  const state = await getSessionPlayerState(parsed.sessionId);

  if (!state || state.session.status !== 'in_progress') {
    throw new Error('Session is not active.');
  }

  const currentQuestion = state.questions[state.session.currentQuestionPosition];
  if (!currentQuestion || currentQuestion.id !== parsed.questionId) {
    throw new Error('This is not the current session question.');
  }

  const { response } = await createResponseAttempt(parsed);

  try {
    const evaluation = await evaluateResponse(response.id);

    return {
      status: 'evaluated' as const,
      responseId: response.id,
      attemptNumber: response.attemptNumber,
      transcript: response.transcript,
      evaluation,
    };
  } catch (error) {
    console.error('Response evaluation failed after transcript was saved', error);

    return {
      status: 'evaluation_error' as const,
      responseId: response.id,
      attemptNumber: response.attemptNumber,
      transcript: response.transcript,
    };
  }
}

const retryEvaluationSchema = z.object({
  sessionId: z.string().uuid(),
  responseId: z.string().uuid(),
});

export async function retryResponseEvaluationAction(input: unknown) {
  const parsed = retryEvaluationSchema.parse(input);
  const state = await getSessionPlayerState(parsed.sessionId);

  if (!state || state.session.status !== 'in_progress') {
    throw new Error('Session is not active.');
  }

  const currentQuestion = state.questions[state.session.currentQuestionPosition];
  if (!currentQuestion) {
    throw new Error('Current question not found.');
  }

  const attempt = state.attempts.find(
    (candidate) => candidate.response.id === parsed.responseId,
  );

  if (
    !attempt ||
    attempt.response.sessionId !== parsed.sessionId ||
    attempt.response.questionId !== currentQuestion.id
  ) {
    throw new Error('Response does not belong to the current session question.');
  }

  const evaluation = await evaluateResponse(attempt.response.id);

  return {
    responseId: attempt.response.id,
    attemptNumber: attempt.response.attemptNumber,
    transcript: attempt.response.transcript,
    evaluation,
  };
}

const continueInputSchema = z.object({
  sessionId: z.string().uuid(),
  completedQuestionId: z.string().uuid(),
});

export async function continueSessionAction(input: unknown) {
  const parsed = continueInputSchema.parse(input);
  const state = await getSessionPlayerState(parsed.sessionId);

  if (!state) throw new Error('Session not found.');

  if (state.session.status === 'completed' && state.finalEvaluation) {
    return { completed: true as const, evaluation: state.finalEvaluation };
  }

  const completedQuestion = state.questions.find(
    (question) => question.id === parsed.completedQuestionId,
  );
  if (!completedQuestion) throw new Error('Question not found in session.');

  if (state.session.currentQuestionPosition > completedQuestion.position) {
    return { completed: false as const, session: state.session };
  }

  if (state.session.currentQuestionPosition !== completedQuestion.position) {
    throw new Error('Session question position is out of sync.');
  }

  const isLastQuestion = completedQuestion.position === state.questions.length - 1;

  if (isLastQuestion) {
    const evaluation = await finalizeSession(parsed.sessionId);
    return { completed: true as const, evaluation };
  }

  const session = await advanceSession(
    parsed.sessionId,
    completedQuestion.position + 1,
    state.questions.length,
  );

  return { completed: false as const, session };
}

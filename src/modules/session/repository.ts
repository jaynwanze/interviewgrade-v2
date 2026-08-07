import { and, asc, eq, max } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  practiceQuestions,
  practiceVersions,
  practices,
  responseEvaluations,
  responses,
  rubricCriteria,
  sessionEvaluations,
  sessions,
} from '@/lib/db/schema';
import { getPublishedPracticeBySlug } from '@/modules/practice/repository';
import { MAX_RESPONSE_ATTEMPTS_PER_QUESTION } from '@/modules/session/constants';

export async function startPracticeSession(
  slug: string,
  participantUserId?: string | null,
) {
  const published = await getPublishedPracticeBySlug(slug);
  if (!published) {
    throw new Error('Published practice not found.');
  }

  const [session] = await db
    .insert(sessions)
    .values({
      practiceVersionId: published.version.id,
      participantUserId: participantUserId ?? null,
      status: 'in_progress',
      currentQuestionPosition: 0,
    })
    .returning();

  if (!session) throw new Error('Failed to start session.');
  return session;
}

export async function getSessionPlayerState(sessionId: string) {
  const [sessionRow] = await db
    .select({
      session: sessions,
      version: practiceVersions,
      practice: practices,
    })
    .from(sessions)
    .innerJoin(
      practiceVersions,
      eq(sessions.practiceVersionId, practiceVersions.id),
    )
    .innerJoin(practices, eq(practiceVersions.practiceId, practices.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRow) return null;

  const [questions, criteria, attempts, finalEvaluation] = await Promise.all([
    db
      .select()
      .from(practiceQuestions)
      .where(eq(practiceQuestions.practiceVersionId, sessionRow.version.id))
      .orderBy(asc(practiceQuestions.position)),
    db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.practiceVersionId, sessionRow.version.id))
      .orderBy(asc(rubricCriteria.position)),
    db
      .select({ response: responses, evaluation: responseEvaluations })
      .from(responses)
      .leftJoin(
        responseEvaluations,
        eq(responseEvaluations.responseId, responses.id),
      )
      .where(eq(responses.sessionId, sessionId))
      .orderBy(asc(responses.createdAt)),
    db
      .select()
      .from(sessionEvaluations)
      .where(eq(sessionEvaluations.sessionId, sessionId))
      .limit(1),
  ]);

  return {
    ...sessionRow,
    questions,
    criteria,
    attempts,
    finalEvaluation: finalEvaluation[0] ?? null,
  };
}

export async function createResponseAttempt(input: {
  sessionId: string;
  questionId: string;
  transcript: string;
  audioPath?: string | null;
}) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, input.sessionId))
    .limit(1);

  if (!session || session.status !== 'in_progress') {
    throw new Error('Session is not active.');
  }

  const [question] = await db
    .select()
    .from(practiceQuestions)
    .where(
      and(
        eq(practiceQuestions.id, input.questionId),
        eq(practiceQuestions.practiceVersionId, session.practiceVersionId),
      ),
    )
    .limit(1);

  if (!question) {
    throw new Error('Question does not belong to this session.');
  }

  const [attemptResult] = await db
    .select({ maxAttempt: max(responses.attemptNumber) })
    .from(responses)
    .where(
      and(
        eq(responses.sessionId, input.sessionId),
        eq(responses.questionId, input.questionId),
      ),
    );

  const previousAttempt = attemptResult?.maxAttempt ?? 0;
  if (previousAttempt >= MAX_RESPONSE_ATTEMPTS_PER_QUESTION) {
    throw new Error(
      `This question is limited to ${MAX_RESPONSE_ATTEMPTS_PER_QUESTION} attempts. Continue to the next question.`,
    );
  }

  const attemptNumber = previousAttempt + 1;

  const [response] = await db
    .insert(responses)
    .values({
      sessionId: input.sessionId,
      questionId: input.questionId,
      attemptNumber,
      transcript: input.transcript,
      audioPath: input.audioPath ?? null,
    })
    .returning();

  if (!response) throw new Error('Failed to save response.');
  return { response, question, session };
}

export async function advanceSession(
  sessionId: string,
  nextQuestionPosition: number,
  questionCount: number,
) {
  const complete = nextQuestionPosition >= questionCount;

  const [session] = await db
    .update(sessions)
    .set({
      currentQuestionPosition: Math.min(nextQuestionPosition, questionCount),
      status: complete ? 'completed' : 'in_progress',
      completedAt: complete ? new Date() : null,
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  if (!session) throw new Error('Failed to advance session.');
  return session;
}

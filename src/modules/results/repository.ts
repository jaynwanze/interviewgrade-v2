import { desc, eq, inArray } from 'drizzle-orm';

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
import { requireOrganizationMembership } from '@/modules/organization/repository';

async function requireOwnedPractice(practiceId: string, userId: string) {
  const [practice] = await db
    .select()
    .from(practices)
    .where(eq(practices.id, practiceId))
    .limit(1);

  if (!practice) return null;
  await requireOrganizationMembership(practice.organizationId, userId);
  return practice;
}

export async function getPracticeResultsOverview(
  practiceId: string,
  userId: string,
) {
  const practice = await requireOwnedPractice(practiceId, userId);
  if (!practice) return null;

  const [draftVersion] = await db
    .select()
    .from(practiceVersions)
    .where(eq(practiceVersions.practiceId, practiceId))
    .orderBy(practiceVersions.versionNumber)
    .limit(1);

  const rows = await db
    .select({
      session: sessions,
      versionNumber: practiceVersions.versionNumber,
      evaluation: sessionEvaluations,
    })
    .from(sessions)
    .innerJoin(
      practiceVersions,
      eq(sessions.practiceVersionId, practiceVersions.id),
    )
    .leftJoin(
      sessionEvaluations,
      eq(sessionEvaluations.sessionId, sessions.id),
    )
    .where(eq(practiceVersions.practiceId, practiceId))
    .orderBy(desc(sessions.startedAt));

  const completed = rows.filter(
    (row) => row.session.status === 'completed' && row.evaluation,
  );
  const averageScore =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (sum, row) => sum + (row.evaluation?.overallScore ?? 0),
            0,
          ) / completed.length,
        )
      : null;

  const versionIds = [...new Set(rows.map((row) => row.session.practiceVersionId))];
  const criteria =
    versionIds.length > 0
      ? await db
          .select()
          .from(rubricCriteria)
          .where(inArray(rubricCriteria.practiceVersionId, versionIds))
      : [];

  const criterionNames = new Map(
    criteria.map((criterion) => [criterion.id, criterion.name]),
  );
  const criterionAggregate = new Map<
    string,
    { sum: number; count: number }
  >();

  for (const row of completed) {
    for (const [criterionId, score] of Object.entries(
      row.evaluation?.criterionScores ?? {},
    )) {
      const name = criterionNames.get(criterionId);
      if (!name || typeof score !== 'number') continue;
      const current = criterionAggregate.get(name) ?? { sum: 0, count: 0 };
      current.sum += score;
      current.count += 1;
      criterionAggregate.set(name, current);
    }
  }

  const weakestCriteria = [...criterionAggregate.entries()]
    .map(([name, aggregate]) => ({
      name,
      score: Math.round(aggregate.sum / aggregate.count),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    practice,
    title: draftVersion?.title ?? 'Practice',
    totalSessions: rows.length,
    completions: completed.length,
    averageScore,
    weakestCriteria,
    recentSessions: rows.slice(0, 20),
  };
}

export async function getCreatorSessionResult(
  sessionId: string,
  userId: string,
) {
  const [root] = await db
    .select({
      session: sessions,
      version: practiceVersions,
      practice: practices,
      finalEvaluation: sessionEvaluations,
    })
    .from(sessions)
    .innerJoin(
      practiceVersions,
      eq(sessions.practiceVersionId, practiceVersions.id),
    )
    .innerJoin(practices, eq(practiceVersions.practiceId, practices.id))
    .leftJoin(
      sessionEvaluations,
      eq(sessionEvaluations.sessionId, sessions.id),
    )
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!root) return null;
  await requireOrganizationMembership(root.practice.organizationId, userId);

  const [questions, criteria, attempts] = await Promise.all([
    db
      .select()
      .from(practiceQuestions)
      .where(eq(practiceQuestions.practiceVersionId, root.version.id))
      .orderBy(practiceQuestions.position),
    db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.practiceVersionId, root.version.id))
      .orderBy(rubricCriteria.position),
    db
      .select({ response: responses, evaluation: responseEvaluations })
      .from(responses)
      .leftJoin(
        responseEvaluations,
        eq(responseEvaluations.responseId, responses.id),
      )
      .where(eq(responses.sessionId, sessionId))
      .orderBy(responses.createdAt),
  ]);

  return { ...root, questions, criteria, attempts };
}

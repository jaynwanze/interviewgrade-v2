import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PracticeBuilderForm } from '@/components/practice/practice-builder-form';
import { requireUser } from '@/lib/auth/require-user';
import { getPracticeDraft } from '@/modules/practice/repository';

type EditPracticePageProps = {
  params: Promise<{ practiceId: string }>;
};

export default async function EditPracticePage({ params }: EditPracticePageProps) {
  const user = await requireUser();
  const { practiceId } = await params;
  const draft = await getPracticeDraft(practiceId, user.id);

  if (!draft) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <Link
          href={`/dashboard/practices/${practiceId}`}
          className="text-sm text-[var(--muted)]"
        >
          ← Back to practice
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Edit draft</h1>
        <p className="text-[var(--muted)]">
          Changes affect only the working draft. Previously published versions and
          historical sessions stay unchanged.
        </p>
      </div>

      <PracticeBuilderForm
        organizationId={draft.practice.organizationId}
        practiceId={draft.practice.id}
        initialDraft={{
          title: draft.version.title,
          description: draft.version.description,
          scenario: draft.version.scenario,
          instructions: draft.version.instructions,
          difficulty: draft.version.difficulty,
          estimatedMinutes: draft.version.estimatedMinutes,
          questions: draft.questions.map((question) => ({
            prompt: question.prompt,
            sampleAnswer: question.sampleAnswer ?? undefined,
          })),
          rubricCriteria: draft.criteria.map((criterion) => ({
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
          })),
        }}
      />
    </main>
  );
}

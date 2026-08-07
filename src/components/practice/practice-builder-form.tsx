'use client';

import { useMemo, useState } from 'react';

import { createPracticeAction } from '@/modules/practice/actions';

type QuestionDraft = {
  prompt: string;
  sampleAnswer?: string;
};

type CriterionDraft = {
  name: string;
  description: string;
  weight: number;
};

function rebalanceCriteria(criteria: CriterionDraft[]) {
  const base = Math.floor(100 / criteria.length);
  let remainder = 100 - base * criteria.length;

  return criteria.map((criterion) => {
    const weight = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return { ...criterion, weight };
  });
}

export function PracticeBuilderForm({ organizationId }: { organizationId: string }) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { prompt: '', sampleAnswer: '' },
  ]);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    {
      name: 'Communication',
      description: 'Communicates clearly, specifically, and appropriately for the scenario.',
      weight: 100,
    },
  ]);

  const totalWeight = useMemo(
    () => criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0),
    [criteria],
  );

  return (
    <form action={createPracticeAction} className="space-y-10">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="questionsJson" value={JSON.stringify(questions)} />
      <input type="hidden" name="rubricJson" value={JSON.stringify(criteria)} />

      <section className="space-y-5 rounded-2xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Practice setup</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Describe one real situation somebody should practise handling.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={200}
            placeholder="Handling a price objection"
            className="w-full rounded-lg border bg-transparent px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <input
            name="description"
            maxLength={2000}
            placeholder="Short internal or learner-facing description"
            className="w-full rounded-lg border bg-transparent px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Scenario</span>
          <textarea
            name="scenario"
            required
            minLength={20}
            rows={6}
            placeholder="You are a junior SaaS sales representative. A prospect likes the product but says the price is too high..."
            className="w-full rounded-lg border bg-transparent px-3 py-2.5"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Instructions</span>
          <textarea
            name="instructions"
            rows={3}
            placeholder="Answer naturally as if this were a real conversation."
            className="w-full rounded-lg border bg-transparent px-3 py-2.5"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Difficulty</span>
            <select name="difficulty" defaultValue="Medium" className="w-full rounded-lg border bg-transparent px-3 py-2.5">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Estimated minutes</span>
            <input
              name="estimatedMinutes"
              type="number"
              min={1}
              max={180}
              defaultValue={10}
              className="w-full rounded-lg border bg-transparent px-3 py-2.5"
            />
          </label>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Questions</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Keep the MVP structured: one spoken answer per question.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuestions((current) => [...current, { prompt: '', sampleAnswer: '' }])}
            className="rounded-lg border px-3 py-2 text-sm font-medium"
          >
            + Question
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="space-y-3 rounded-xl bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Question {index + 1}</span>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}
                    className="text-sm text-[var(--muted)]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <textarea
                value={question.prompt}
                onChange={(event) =>
                  setQuestions((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, prompt: event.target.value } : item,
                    ),
                  )
                }
                rows={3}
                required
                placeholder="How would you initially respond to the prospect?"
                className="w-full rounded-lg border bg-[var(--background)] px-3 py-2.5"
              />
              <textarea
                value={question.sampleAnswer ?? ''}
                onChange={(event) =>
                  setQuestions((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, sampleAnswer: event.target.value } : item,
                    ),
                  )
                }
                rows={2}
                placeholder="Optional creator guidance / strong-answer example"
                className="w-full rounded-lg border bg-[var(--background)] px-3 py-2.5"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Rubric</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Define what good looks like. Weights must total 100.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setCriteria((current) =>
                rebalanceCriteria([
                  ...current,
                  { name: '', description: '', weight: 1 },
                ]),
              )
            }
            className="rounded-lg border px-3 py-2 text-sm font-medium"
          >
            + Criterion
          </button>
        </div>

        <div className="space-y-4">
          {criteria.map((criterion, index) => (
            <div key={index} className="grid gap-3 rounded-xl bg-[var(--surface)] p-4 sm:grid-cols-[1fr_110px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Criterion {index + 1}</span>
                  {criteria.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCriteria((current) =>
                          rebalanceCriteria(current.filter((_, i) => i !== index)),
                        )
                      }
                      className="text-sm text-[var(--muted)]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  value={criterion.name}
                  onChange={(event) =>
                    setCriteria((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  required
                  placeholder="Objection handling"
                  className="w-full rounded-lg border bg-[var(--background)] px-3 py-2.5"
                />
                <textarea
                  value={criterion.description}
                  onChange={(event) =>
                    setCriteria((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, description: event.target.value } : item,
                      ),
                    )
                  }
                  required
                  rows={2}
                  placeholder="Acknowledges the concern, explores the underlying issue, and reframes value without becoming defensive."
                  className="w-full rounded-lg border bg-[var(--background)] px-3 py-2.5"
                />
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium">Weight %</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={criterion.weight}
                  onChange={(event) =>
                    setCriteria((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, weight: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="w-full rounded-lg border bg-[var(--background)] px-3 py-2.5"
                />
              </label>
            </div>
          ))}
        </div>

        <p className={totalWeight === 100 ? 'text-sm text-[var(--muted)]' : 'text-sm font-medium'}>
          Total weight: {totalWeight}% {totalWeight === 100 ? '✓' : '— must equal 100%'}
        </p>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={totalWeight !== 100}
          className="rounded-lg bg-[var(--accent)] px-5 py-3 font-medium text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save draft
        </button>
      </div>
    </form>
  );
}

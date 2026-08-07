export type WeightedScore = {
  score: number;
  weight: number;
};

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function clampScore(score: number) {
  assertFiniteNumber(score, 'Score');
  return Math.min(100, Math.max(0, score));
}

export function calculateWeightedScore(items: WeightedScore[]) {
  if (items.length === 0) {
    throw new Error('At least one weighted score is required.');
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const item of items) {
    assertFiniteNumber(item.score, 'Score');
    assertFiniteNumber(item.weight, 'Weight');

    if (item.weight < 0) {
      throw new Error('Weights cannot be negative.');
    }

    weightedTotal += clampScore(item.score) * item.weight;
    totalWeight += item.weight;
  }

  if (totalWeight <= 0) {
    throw new Error('Total weight must be greater than zero.');
  }

  return Math.round(weightedTotal / totalWeight);
}

export function calculateAverageScore(scores: number[]) {
  if (scores.length === 0) {
    throw new Error('At least one score is required.');
  }

  return Math.round(
    scores.reduce((sum, score) => sum + clampScore(score), 0) / scores.length,
  );
}

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateAverageScore,
  calculateWeightedScore,
  clampScore,
} from './scoring.ts';

test('calculateWeightedScore respects rubric weights', () => {
  assert.equal(
    calculateWeightedScore([
      { score: 80, weight: 30 },
      { score: 60, weight: 70 },
    ]),
    66,
  );
});

test('calculateWeightedScore clamps provider scores before arithmetic', () => {
  assert.equal(
    calculateWeightedScore([
      { score: 120, weight: 50 },
      { score: -20, weight: 50 },
    ]),
    50,
  );
});

test('calculateWeightedScore is deterministic for the same stored values', () => {
  const input = [
    { score: 82, weight: 20 },
    { score: 71, weight: 35 },
    { score: 91, weight: 45 },
  ];

  assert.equal(calculateWeightedScore(input), calculateWeightedScore(input));
  assert.equal(calculateWeightedScore(input), 82);
});

test('calculateWeightedScore rejects unusable weight sets', () => {
  assert.throws(
    () => calculateWeightedScore([{ score: 80, weight: 0 }]),
    /greater than zero/,
  );
  assert.throws(
    () => calculateWeightedScore([{ score: 80, weight: -1 }]),
    /cannot be negative/,
  );
});

test('calculateAverageScore rounds and clamps attempt scores', () => {
  assert.equal(calculateAverageScore([74, 80, 91]), 82);
  assert.equal(calculateAverageScore([120, -20]), 50);
});

test('clampScore enforces the persisted 0-100 score range', () => {
  assert.equal(clampScore(-1), 0);
  assert.equal(clampScore(50), 50);
  assert.equal(clampScore(101), 100);
});

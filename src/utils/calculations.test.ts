import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateArithmeticMean,
  calculateDli,
  calculateEpsomDosage,
  calculateMassGainKg,
  computeSessionSummary,
  getOct17Measurement,
} from './calculations';
import { PLANTS } from '../data/argusData';

test('calculateDli matches 22.10 Photone audit bounds (700–760 PPFD)', () => {
  // 12h hypothetical bounds: 30.24 – 32.83
  assert.equal(calculateDli(700, 12), 30.24);
  assert.equal(calculateDli(760, 12), 32.83);
  // 18h hypothetical bounds: 45.36 – 49.25
  assert.equal(calculateDli(700, 18), 45.36);
  assert.equal(calculateDli(760, 18), 49.25);
});

test('calculateArithmeticMean matches 19.10 and 22.10 runoff EC means', () => {
  // 19.10 runoff EC: KB-D 2.0, KB-M 1.8, MELO-D 2.1, MELO-M 1.9 => 1.95
  assert.equal(calculateArithmeticMean([2.0, 1.8, 2.1, 1.9]), 1.95);
  // 22.10 runoff EC: KB-D 2.0, KB-M 1.7, MELO-D 1.8, MELO-M 1.6 => 1.775
  assert.equal(calculateArithmeticMean([2.0, 1.7, 1.8, 1.6]), 1.775);
});

test('22.10 session totals match verified weighing log (16.20 -> 26.40 kg, +10.20 kg)', () => {
  const summary = computeSessionSummary('2026-10-22');
  assert.equal(summary.totalBeforeKg, 16.2);
  assert.equal(summary.totalAfterKg, 26.4);
  assert.equal(summary.totalGainKg, 10.2);
  assert.equal(summary.meanRunoffEc, 1.775);
});

test('17.10 variant selector preserves CSV vs JSON18 without averaging (K-OCT17-WEIGHTS)', () => {
  const kbD = PLANTS.find((p) => p.id === 'KB-D')!;
  const meloM = PLANTS.find((p) => p.id === 'MELO-M')!;

  const kbDCsv = getOct17Measurement(kbD, 'CSV');
  const kbDJson = getOct17Measurement(kbD, 'JSON18');
  assert.equal(kbDCsv?.beforeKg, 3.8);
  assert.equal(kbDJson?.beforeKg, 4.0);
  assert.notEqual(kbDCsv?.beforeKg, kbDJson?.beforeKg);

  const meloMCsv = getOct17Measurement(meloM, 'CSV');
  const meloMJson = getOct17Measurement(meloM, 'JSON18');
  assert.equal(meloMCsv?.beforeKg, 4.0);
  assert.equal(meloMJson?.beforeKg, 3.6);
});

test('calculateEpsomDosage enforces g vs mg unit safety (K-SOFTWARE-EXECUTION)', () => {
  // Adding +25 mg/L Mg requires ~0.254 g/L Epsom, ~3.30 g per 13 L batch (NOT 3300 g!)
  const res = calculateEpsomDosage(25, 13);
  assert.ok(res.gramsPerLiter > 0.25 && res.gramsPerLiter < 0.26);
  assert.ok(res.totalGrams > 3.2 && res.totalGrams < 3.4);
  assert.equal(res.resultingMgMgLWithEmmerich, 34.7);
  assert.equal(res.caToMgRatioWithEmmerich, 2.2);
});

test('calculateMassGainKg computes exact gain and handles nulls safely', () => {
  assert.equal(calculateMassGainKg(3.8, 6.47), 2.67);
  assert.equal(calculateMassGainKg(null, 6.47), null);
});

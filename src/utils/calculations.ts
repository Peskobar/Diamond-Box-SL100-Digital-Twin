import { PLANTS, type Oct17Variant, type PlantId, type PlantProfile } from '../data/argusData';

/**
 * Converts instantaneous PPFD (µmol/m²/s) and photoperiod (hours/day) to DLI (mol/m²/d).
 * Formula: PPFD * hours * 3600 / 1_000_000 = PPFD * hours * 0.0036
 */
export function calculateDli(ppfd: number, photoperiodHours: number): number {
  if (!Number.isFinite(ppfd) || !Number.isFinite(photoperiodHours) || ppfd < 0 || photoperiodHours < 0) {
    return 0;
  }
  return Number((ppfd * photoperiodHours * 0.0036).toFixed(2));
}

/**
 * Arithmetic mean of non-null numeric readings.
 */
export function calculateArithmeticMean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, n) => acc + n, 0);
  return Number((sum / valid.length).toFixed(3));
}

/**
 * Computes mass delta (after - before) in kg, rounded to 3 decimals.
 */
export function calculateMassGainKg(beforeKg: number | null, afterKg: number | null): number | null {
  if (beforeKg === null || afterKg === null || !Number.isFinite(beforeKg) || !Number.isFinite(afterKg)) {
    return null;
  }
  return Number((afterKg - beforeKg).toFixed(3));
}

/**
 * Correct stoichiometry for MgSO4·7H2O (Epsom salt, ~9.86% elemental Mg by mass).
 * Resolves K-SOFTWARE-EXECUTION (avoiding mg vs g 1000x unit bugs).
 */
export function calculateEpsomDosage(targetDeltaMgPerLiter: number, batchVolumeLiters: number): {
  gramsPerLiter: number;
  totalGrams: number;
  resultingMgMgLWithEmmerich: number;
  caToMgRatioWithEmmerich: number;
} {
  const MG_FRACTION_IN_EPSOM = 0.09861; // Mg (24.305) / MgSO4·7H2O (246.47)
  const EMMERICH_CA = 76.5;
  const EMMERICH_MG = 9.7;

  const safeDelta = Math.max(0, targetDeltaMgPerLiter);
  const safeVol = Math.max(0, batchVolumeLiters);

  // target mg Mg / L -> mg Epsom / L -> g Epsom / L (divide by 1000)
  const gramsPerLiter = Number((safeDelta / (MG_FRACTION_IN_EPSOM * 1000)).toFixed(3));
  const totalGrams = Number((gramsPerLiter * safeVol).toFixed(2));
  const resultingMg = Number((EMMERICH_MG + safeDelta).toFixed(1));
  const caToMgRatio = Number((EMMERICH_CA / resultingMg).toFixed(2));

  return {
    gramsPerLiter,
    totalGrams,
    resultingMgMgLWithEmmerich: resultingMg,
    caToMgRatioWithEmmerich: caToMgRatio,
  };
}

/**
 * Returns the explicit 17.10 measurement row for a plant without ever averaging CSV and JSON18.
 */
export function getOct17Measurement(plant: PlantProfile, variant: Oct17Variant) {
  return plant.measurements.find(
    (m) => m.date === '2026-10-17' && m.sourceVariant === variant,
  ) ?? null;
}

/**
 * Returns the latest session measurement (22.10) for a given plant ID.
 */
export function getOct22Measurement(plantId: PlantId) {
  const plant = PLANTS.find((p) => p.id === plantId);
  if (!plant) return null;
  return plant.measurements.find((m) => m.date === '2026-10-22') ?? null;
}

/**
 * Computes session summary totals for a selected 17.10 variant or 22.10 session.
 */
export function computeSessionSummary(sessionDate: '2026-10-17' | '2026-10-22', variant: Oct17Variant = 'CSV') {
  const rows = PLANTS.map((plant) => {
    if (sessionDate === '2026-10-17') {
      return getOct17Measurement(plant, variant);
    }
    return plant.measurements.find((m) => m.date === '2026-10-22') ?? null;
  });

  const totalBeforeKg = Number(
    rows.reduce((sum, r) => sum + (r?.beforeKg ?? 0), 0).toFixed(2),
  );
  const totalAfterKg = Number(
    rows.reduce((sum, r) => sum + (r?.afterKg ?? 0), 0).toFixed(2),
  );
  const totalGainKg = Number((totalAfterKg - totalBeforeKg).toFixed(2));
  const meanRunoffEc = calculateArithmeticMean(rows.map((r) => r?.runoffEc));

  return {
    totalBeforeKg,
    totalAfterKg,
    totalGainKg,
    meanRunoffEc,
  };
}

import type { Macros } from "./types.js";

/**
 * Atwater energy factors: calories per gram of each macronutrient.
 * These are the physiological energy values DietCalibrator has always used
 * (see the original `food.model.js` pre-save hook).
 */
export const ATWATER = { fat: 9, carb: 4, prot: 4 } as const;

/** Round to `decimals` places (1 by default), matching the app's `roundFloat`. */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Calories in a set of macros: `fats*9 + carbs*4 + prots*4`. */
export function calcCalories({ fats, carbs, prots }: Macros): number {
  return fats * ATWATER.fat + carbs * ATWATER.carb + prots * ATWATER.prot;
}

/**
 * Share of total calories coming from each macro, in whole tenths of a percent
 * that sum to *exactly* 100.0.
 *
 * Naively rounding each share independently can yield 99.9% or 100.1%. This
 * ports the original app's largest-remainder apportionment: compute each share
 * in tenths-of-a-percent, floor them, then hand the leftover tenths to the
 * macros with the largest fractional parts. A faithful reproduction of
 * `TotalsModel.calculatePercentages`.
 */
export function macroPercentages(macros: Macros): {
  fatPct: number;
  carbPct: number;
  protPct: number;
} {
  const cals = calcCalories(macros);
  if (cals <= 0) return { fatPct: 0, carbPct: 0, protPct: 0 };

  // Work in tenths of a percent (0..1000) so the result has 0.1% resolution.
  const raw = [
    (macros.fats * ATWATER.fat) / cals,
    (macros.carbs * ATWATER.carb) / cals,
    (macros.prots * ATWATER.prot) / cals,
  ].map((share) => share * 1000);

  const ints = raw.map((v) => Math.floor(v));
  let leftover = 1000 - (ints[0] + ints[1] + ints[2]);

  // Distribute the remaining tenths to the largest fractional parts first.
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; leftover > 0; k++) {
    ints[byFraction[k % 3].i]++;
    leftover--;
  }

  return { fatPct: ints[0] / 10, carbPct: ints[1] / 10, protPct: ints[2] / 10 };
}

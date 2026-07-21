import type { Macros } from "./types.js";

/**
 * Atwater energy factors: calories per gram of each macronutrient.
 * These are the physiological energy values DietCalibrator has always used
 * (see the original `food.model.js` pre-save hook).
 */
export const ATWATER = { fat: 9, carb: 4, prot: 4 } as const;

/**
 * Round `value` to `decimals` places (1 by default).
 *
 * The obvious `Math.round(value * 10**decimals) / 10**decimals` is wrong twice
 * over: multiplying introduces binary floating-point error (`1.005 * 100` is
 * `100.49999999999999`, which rounds *down* to `1.00`), and `Math.round` breaks
 * ties toward +∞, so negatives round asymmetrically (`Math.round(-0.5)` is `-0`
 * but `Math.round(0.5)` is `1`). Both matter here — `round` is applied to signed
 * quantities like weight deltas and remaining-to-goal.
 *
 * Instead we shift the decimal point with exponential string notation (which the
 * number parser resolves without the multiply error) and break ties by rounding
 * half away from zero, so +x and -x round symmetrically.
 */
export function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const shifted = Number(`${Math.abs(value)}e${decimals}`);
  const rounded = Math.round(shifted);
  const result = sign * Number(`${rounded}e${-decimals}`);
  return result === 0 ? 0 : result; // normalize -0 to 0
}

/** Calories in a set of macros: `fats*9 + carbs*4 + prots*4`. */
export function calcCalories({ fats, carbs, prots }: Macros): number {
  return fats * ATWATER.fat + carbs * ATWATER.carb + prots * ATWATER.prot;
}

/**
 * Share of total calories coming from each macro, in whole tenths of a percent
 * that sum to *exactly* 100.0.
 *
 * Rounding each share independently can yield 99.9% or 100.1%. This ports the
 * original app's largest-remainder apportionment, which sums to exactly 100.0:
 * compute each share in tenths-of-a-percent, floor them, then hand the leftover
 * tenths to the macros with the largest fractional parts. A faithful
 * reproduction of `TotalsModel.calculatePercentages`.
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

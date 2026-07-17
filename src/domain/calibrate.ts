import { ATWATER, round } from "./calories.js";
import type { MacroSplit } from "./types.js";

/** DietCalibrator's default macro split: 25% fat / 55% carb / 20% protein. */
export const DEFAULT_SPLIT: MacroSplit = {
  fperGoal: 25,
  cperGoal: 55,
  pperGoal: 20,
};

export interface CalibrationResult {
  calsGoal: number;
  split: MacroSplit;
  /** Sum of the three percentages; should be 100. */
  percentTotal: number;
  /** True when the split sums to exactly 100%. */
  valid: boolean;
  /** Target grams of each macro to hit the calorie goal at the given split. */
  fatGrams: number;
  carbGrams: number;
  protGrams: number;
}

/**
 * The namesake calibration: turn a daily calorie goal + a macro percentage
 * split into gram targets per macro.
 *
 *   grams = calsGoal * (percent / 100) / caloriesPerGram
 *
 * Ports `TotalsModel.calculators.{fgGoal,cgGoal,pgGoal}`.
 */
export function calibrateMacros(
  calsGoal: number,
  split: MacroSplit = DEFAULT_SPLIT,
): CalibrationResult {
  const { fperGoal, cperGoal, pperGoal } = split;
  const percentTotal = round(fperGoal + cperGoal + pperGoal, 1);

  return {
    calsGoal,
    split,
    percentTotal,
    valid: percentTotal === 100,
    fatGrams: round((calsGoal * (fperGoal / 100)) / ATWATER.fat, 1),
    carbGrams: round((calsGoal * (cperGoal / 100)) / ATWATER.carb, 1),
    protGrams: round((calsGoal * (pperGoal / 100)) / ATWATER.prot, 1),
  };
}

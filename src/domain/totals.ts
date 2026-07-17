import { calcCalories, macroPercentages, round } from "./calories.js";
import { calibrateMacros } from "./calibrate.js";
import type { DayGoals, Macros, TrackerEntry } from "./types.js";

export interface DayTotals {
  date: string;
  entryCount: number;
  /** What has actually been logged for the day. */
  consumed: Macros & {
    cals: number;
    fatPct: number;
    carbPct: number;
    protPct: number;
  };
  /** The calibrated targets for the day. */
  goal: {
    calsGoal: number;
    calsExer: number;
    /** calsGoal + calsExer — the allowance after exercise is added back. */
    adjCalsGoal: number;
    fatGrams: number;
    carbGrams: number;
    protGrams: number;
  };
  /** Goal minus consumed. Negative means over. */
  remaining: {
    cals: number;
    fats: number;
    carbs: number;
    prots: number;
  };
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

/**
 * Roll a day's logged entries up against its goal.
 *
 * Ports the `TotalsModel` calculators: `adjCalsGoal = calsGoal + calsExer`,
 * `calsToGoal = adjCalsGoal - calsCurr`, and per-macro `gToGoal = gGoal - gCurr`.
 */
export function computeDayTotals(
  date: string,
  entries: TrackerEntry[],
  goals: DayGoals,
): DayTotals {
  const fats = round(sum(entries.map((e) => e.fats)), 1);
  const carbs = round(sum(entries.map((e) => e.carbs)), 1);
  const prots = round(sum(entries.map((e) => e.prots)), 1);
  const cals = round(calcCalories({ fats, carbs, prots }), 0);

  const target = calibrateMacros(goals.calsGoal, goals);
  const adjCalsGoal = goals.calsGoal + goals.calsExer;
  const pct = macroPercentages({ fats, carbs, prots });

  return {
    date,
    entryCount: entries.length,
    consumed: { fats, carbs, prots, cals, ...pct },
    goal: {
      calsGoal: goals.calsGoal,
      calsExer: goals.calsExer,
      adjCalsGoal,
      fatGrams: target.fatGrams,
      carbGrams: target.carbGrams,
      protGrams: target.protGrams,
    },
    remaining: {
      cals: round(adjCalsGoal - cals, 0),
      fats: round(target.fatGrams - fats, 1),
      carbs: round(target.carbGrams - carbs, 1),
      prots: round(target.protGrams - prots, 1),
    },
  };
}

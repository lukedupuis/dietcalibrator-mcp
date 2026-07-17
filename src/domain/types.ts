/** Grams of each macronutrient. The atomic unit the whole engine works in. */
export interface Macros {
  fats: number;
  carbs: number;
  prots: number;
}

/**
 * A saved food (the "Foods table" in the original app). Macros are expressed
 * per one serving of `srvSize` `srvType` (e.g. 100 g, 1 cup).
 */
export interface Food extends Macros {
  id: string;
  name: string;
  srvSize: number;
  srvType: string;
  /** Derived from macros via the Atwater factors; never stored by hand. */
  cals: number;
  /** Whether the food is shared to the public library vs. private to a user. */
  shared: boolean;
}

/** A food logged to a given day (the "Today table"), scaled by `servings`. */
export interface TrackerEntry extends Macros {
  id: string;
  date: string; // YYYY-MM-DD
  foodId: string | null;
  name: string;
  servings: number;
  srvSize: number;
  srvType: string;
  cals: number;
}

/** The macro split as percentages of total calories. Should sum to 100. */
export interface MacroSplit {
  fperGoal: number;
  cperGoal: number;
  pperGoal: number;
}

/** A day's calorie/macro goal, supplied when computing totals. */
export interface DayGoals extends MacroSplit {
  calsGoal: number;
  /** Exercise calories, added back to the daily allowance. */
  calsExer: number;
}

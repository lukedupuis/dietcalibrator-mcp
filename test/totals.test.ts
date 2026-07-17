import { describe, expect, it } from "vitest";
import { DEFAULT_SPLIT } from "../src/domain/calibrate.js";
import { computeDayTotals } from "../src/domain/totals.js";
import type { TrackerEntry } from "../src/domain/types.js";

function entry(partial: Partial<TrackerEntry>): TrackerEntry {
  return {
    id: "x",
    date: "2026-07-17",
    foodId: null,
    name: "food",
    servings: 1,
    srvSize: 1,
    srvType: "serving",
    fats: 0,
    carbs: 0,
    prots: 0,
    cals: 0,
    ...partial,
  };
}

describe("computeDayTotals", () => {
  const goals = { calsGoal: 2000, calsExer: 0, ...DEFAULT_SPLIT };

  it("sums consumed macros and computes remaining against the goal", () => {
    const totals = computeDayTotals(
      "2026-07-17",
      [entry({ fats: 10, carbs: 20, prots: 30 })],
      goals,
    );
    expect(totals.consumed.cals).toBe(290); // 90 + 80 + 120
    expect(totals.goal.calsGoal).toBe(2000);
    expect(totals.remaining.cals).toBe(1710); // 2000 - 290
    expect(totals.remaining.fats).toBe(45.6); // 55.6 - 10
    expect(totals.remaining.carbs).toBe(255); // 275 - 20
    expect(totals.remaining.prots).toBe(70); // 100 - 30
  });

  it("adds exercise calories back into the allowance", () => {
    const totals = computeDayTotals("2026-07-17", [], { ...goals, calsExer: 300 });
    expect(totals.goal.adjCalsGoal).toBe(2300);
    expect(totals.remaining.cals).toBe(2300);
  });

  it("sums multiple entries", () => {
    const totals = computeDayTotals(
      "2026-07-17",
      [entry({ fats: 5, carbs: 5, prots: 5 }), entry({ fats: 5, carbs: 5, prots: 5 })],
      goals,
    );
    expect(totals.entryCount).toBe(2);
    expect(totals.consumed.fats).toBe(10);
    expect(totals.consumed.cals).toBe(170);
  });
});

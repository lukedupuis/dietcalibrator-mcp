import { describe, expect, it } from "vitest";
import { calcCalories, macroPercentages, round } from "../src/domain/calories.js";

describe("round", () => {
  it("rounds half up without binary floating-point drift", () => {
    // The naive `Math.round(v * 10**d) / 10**d` rounds these *down* because the
    // multiply loses precision (e.g. 1.005 * 100 === 100.49999999999999).
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(0.45, 1)).toBe(0.5);
  });

  it("rounds negatives symmetrically (half away from zero)", () => {
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(-0.45, 1)).toBe(-0.5);
    expect(round(-2.5, 0)).toBe(-3);
    expect(round(2.5, 0)).toBe(3);
  });

  it("normalizes -0 to 0", () => {
    expect(Object.is(round(-0.04, 1), 0)).toBe(true);
  });

  it("defaults to one decimal place", () => {
    expect(round(3.14159)).toBe(3.1);
  });
});

describe("calcCalories", () => {
  it("applies the Atwater factors (fat 9, carb 4, protein 4)", () => {
    expect(calcCalories({ fats: 10, carbs: 20, prots: 30 })).toBe(290);
  });

  it("is zero for empty macros", () => {
    expect(calcCalories({ fats: 0, carbs: 0, prots: 0 })).toBe(0);
  });
});

describe("macroPercentages", () => {
  it("always sums to exactly 100 (largest-remainder apportionment)", () => {
    const { fatPct, carbPct, protPct } = macroPercentages({ fats: 10, carbs: 10, prots: 10 });
    expect(fatPct + carbPct + protPct).toBe(100);
    // 90/40/40 kcal of 170 -> fat gets the leftover tenth.
    expect(fatPct).toBe(53);
    expect(carbPct).toBe(23.5);
    expect(protPct).toBe(23.5);
  });

  it("returns zeros when there are no calories", () => {
    expect(macroPercentages({ fats: 0, carbs: 0, prots: 0 })).toEqual({
      fatPct: 0,
      carbPct: 0,
      protPct: 0,
    });
  });

  it("holds the sum invariant across many random inputs", () => {
    for (let i = 0; i < 200; i++) {
      const macros = {
        fats: Math.round(Math.random() * 100),
        carbs: Math.round(Math.random() * 100),
        prots: Math.round(Math.random() * 100),
      };
      const { fatPct, carbPct, protPct } = macroPercentages(macros);
      if (calcCalories(macros) > 0) {
        // Work in tenths to avoid float re-summation noise; must be exactly 1000.
        expect(Math.round((fatPct + carbPct + protPct) * 10)).toBe(1000);
      }
    }
  });
});

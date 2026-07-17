import { describe, expect, it } from "vitest";
import { calibrateMacros, DEFAULT_SPLIT } from "../src/domain/calibrate.js";

describe("calibrateMacros", () => {
  it("turns a calorie goal into gram targets at the default 25/55/20 split", () => {
    const r = calibrateMacros(2000);
    expect(r.split).toEqual(DEFAULT_SPLIT);
    expect(r.valid).toBe(true);
    expect(r.percentTotal).toBe(100);
    expect(r.fatGrams).toBe(55.6); // 2000 * .25 / 9
    expect(r.carbGrams).toBe(275); // 2000 * .55 / 4
    expect(r.protGrams).toBe(100); // 2000 * .20 / 4
  });

  it("honors a custom split", () => {
    const r = calibrateMacros(2400, { fperGoal: 30, cperGoal: 40, pperGoal: 30 });
    expect(r.fatGrams).toBe(80); // 2400 * .30 / 9
    expect(r.carbGrams).toBe(240); // 2400 * .40 / 4
    expect(r.protGrams).toBe(180); // 2400 * .30 / 4
    expect(r.valid).toBe(true);
  });

  it("flags a split that does not sum to 100", () => {
    const r = calibrateMacros(2000, { fperGoal: 25, cperGoal: 55, pperGoal: 25 });
    expect(r.percentTotal).toBe(105);
    expect(r.valid).toBe(false);
  });
});

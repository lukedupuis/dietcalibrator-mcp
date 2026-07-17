import { describe, expect, it } from "vitest";
import { Store } from "../src/store/store.js";

function memStore() {
  return new Store({ filePath: null });
}

describe("Store", () => {
  it("seeds the foods library on a fresh store", () => {
    const store = memStore();
    expect(store.listFoods().length).toBeGreaterThan(10);
    expect(store.listFoods()[0]).toHaveProperty("cals");
  });

  it("searches foods by case-insensitive substring", () => {
    const store = memStore();
    const hits = store.searchFoods("chicken");
    expect(hits.length).toBe(1);
    expect(hits[0].name.toLowerCase()).toContain("chicken");
  });

  it("derives calories when saving a food", () => {
    const store = memStore();
    const food = store.addFood({ name: "Butter", srvSize: 1, srvType: "tbsp", fats: 11, carbs: 0, prots: 0 });
    expect(food.cals).toBe(99); // 11 * 9
    expect(food.id).toBeTruthy();
    expect(store.getFood(food.id)).toEqual(food);
  });

  it("scales a logged entry by servings and derives its calories", () => {
    const store = memStore();
    const e = store.addEntry({
      date: "2026-07-17",
      foodId: null,
      name: "Rice x2",
      servings: 2,
      srvSize: 1,
      srvType: "cup",
      fats: 0.4,
      carbs: 45,
      prots: 4,
    });
    expect(e.cals).toBe(round(0.4 * 9 + 45 * 4 + 4 * 4));
    expect(store.getDay("2026-07-17").entries).toHaveLength(1);
  });

  it("records a weigh-in", () => {
    const store = memStore();
    const day = store.setWeight("2026-07-17", 180, 170);
    expect(day.weight).toBe(180);
    expect(day.weightGoal).toBe(170);
    expect(store.listDates()).toContain("2026-07-17");
  });
});

function round(n: number): number {
  return Math.round(n);
}

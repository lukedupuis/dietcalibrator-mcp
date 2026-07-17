import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { calcCalories, round } from "../domain/calories.js";
import { SEED_FOODS } from "../data/foods.seed.js";
import type { Food, TrackerEntry } from "../domain/types.js";

export interface DayRecord {
  date: string;
  weight: number | null;
  weightGoal: number | null;
  entries: TrackerEntry[];
}

interface StoreData {
  foods: Food[];
  days: Record<string, DayRecord>;
}

export interface StoreOptions {
  /** File to persist to. Pass `null` for an in-memory store (used by tests). */
  filePath?: string | null;
}

function seedFoods(): Food[] {
  return SEED_FOODS.map((f) => ({
    id: randomUUID(),
    shared: true,
    ...f,
    cals: round(calcCalories(f), 0),
  }));
}

/**
 * The persistence layer: the Foods table plus per-day logs. Backed by a single
 * JSON file (or memory). Deliberately tiny and synchronous — a demo dev tool,
 * not a production datastore. The trade-offs are called out in ARCHITECTURE.md.
 */
export class Store {
  private data: StoreData;
  private readonly filePath: string | null;

  constructor(opts: StoreOptions = {}) {
    this.filePath = opts.filePath ?? null;
    this.data = this.load();
  }

  private load(): StoreData {
    if (this.filePath) {
      try {
        const raw = readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw) as StoreData;
        if (parsed.foods?.length) return parsed;
      } catch {
        // No file yet (or unreadable) — fall through to a freshly seeded store.
      }
    }
    return { foods: seedFoods(), days: {} };
  }

  private persist(): void {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // --- Foods table ---------------------------------------------------------

  listFoods(): Food[] {
    return [...this.data.foods];
  }

  getFood(id: string): Food | undefined {
    return this.data.foods.find((f) => f.id === id);
  }

  searchFoods(query: string, limit = 10): Food[] {
    const q = query.trim().toLowerCase();
    const matches = q
      ? this.data.foods.filter((f) => f.name.toLowerCase().includes(q))
      : this.data.foods;
    return matches.slice(0, limit);
  }

  addFood(input: Omit<Food, "id" | "cals" | "shared"> & { shared?: boolean }): Food {
    const food: Food = {
      ...input,
      id: randomUUID(),
      shared: input.shared ?? false,
      cals: round(calcCalories(input), 0),
    };
    this.data.foods.push(food);
    this.persist();
    return food;
  }

  // --- Days (the "Today" table) -------------------------------------------

  listDates(): string[] {
    return Object.keys(this.data.days).sort();
  }

  getDay(date: string): DayRecord {
    return (
      this.data.days[date] ?? {
        date,
        weight: null,
        weightGoal: null,
        entries: [],
      }
    );
  }

  private ensureDay(date: string): DayRecord {
    this.data.days[date] ??= {
      date,
      weight: null,
      weightGoal: null,
      entries: [],
    };
    return this.data.days[date];
  }

  addEntry(
    entry: Omit<TrackerEntry, "id" | "cals"> & { cals?: number },
  ): TrackerEntry {
    const full: TrackerEntry = {
      ...entry,
      id: randomUUID(),
      cals: round(calcCalories(entry), 0),
    };
    this.ensureDay(entry.date).entries.push(full);
    this.persist();
    return full;
  }

  setWeight(date: string, weight: number, weightGoal?: number): DayRecord {
    const day = this.ensureDay(date);
    day.weight = weight;
    if (weightGoal !== undefined) day.weightGoal = weightGoal;
    this.persist();
    return day;
  }
}

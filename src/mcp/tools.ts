import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { calcCalories, macroPercentages, round } from "../domain/calories.js";
import { calibrateMacros, DEFAULT_SPLIT } from "../domain/calibrate.js";
import { computeDayTotals } from "../domain/totals.js";
import type { Store } from "../store/store.js";
import { DATE_RE, today } from "../util/date.js";

/** Wrap a plain result object as an MCP tool result (human text + structured). */
function result(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

/** An error tool result the model can read and recover from. */
function failure(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

const gramsField = z.number().min(0);
const splitFields = {
  fperGoal: z.number().min(0).max(100).optional(),
  cperGoal: z.number().min(0).max(100).optional(),
  pperGoal: z.number().min(0).max(100).optional(),
};

export function registerTools(server: McpServer, store: Store): void {
  // 1. Pure: macros -> calories + macro percentage breakdown.
  server.registerTool(
    "calc_food_calories",
    {
      title: "Calculate food calories",
      description:
        "Compute calories for a set of macros using the Atwater factors " +
        "(fat 9, carb 4, protein 4 cal/g) and the share of calories from each macro.",
      inputSchema: { fats: gramsField, carbs: gramsField, prots: gramsField },
      annotations: { readOnlyHint: true },
    },
    async ({ fats, carbs, prots }) =>
      result({
        fats,
        carbs,
        prots,
        cals: round(calcCalories({ fats, carbs, prots }), 0),
        ...macroPercentages({ fats, carbs, prots }),
      }),
  );

  // 2. Pure: calorie goal + macro split -> gram targets (the calibration).
  server.registerTool(
    "calibrate_macros",
    {
      title: "Calibrate macro targets",
      description:
        "Turn a daily calorie goal and a macro percentage split into gram " +
        "targets per macro. Split defaults to 25% fat / 55% carb / 20% protein.",
      inputSchema: { calsGoal: z.number().positive(), ...splitFields },
      annotations: { readOnlyHint: true },
    },
    async ({ calsGoal, fperGoal, cperGoal, pperGoal }) => {
      const split = {
        fperGoal: fperGoal ?? DEFAULT_SPLIT.fperGoal,
        cperGoal: cperGoal ?? DEFAULT_SPLIT.cperGoal,
        pperGoal: pperGoal ?? DEFAULT_SPLIT.pperGoal,
      };
      const r = calibrateMacros(calsGoal, split);
      return result({ ...r });
    },
  );

  // 3. Search the saved Foods table.
  server.registerTool(
    "search_foods",
    {
      title: "Search saved foods",
      description:
        "Search the saved foods library by name (case-insensitive substring). " +
        "Returns each food's per-serving macros and calories.",
      inputSchema: {
        query: z.string().default(""),
        limit: z.number().int().positive().max(50).default(10),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const foods = store.searchFoods(query, limit);
      return result({ count: foods.length, foods });
    },
  );

  // 4. Save a food to the Foods table.
  server.registerTool(
    "save_food",
    {
      title: "Save a food",
      description:
        "Add a food to the saved library. Calories are derived from the macros — " +
        "you only supply per-serving grams. Returns the saved food with its id.",
      inputSchema: {
        name: z.string().min(1),
        srvSize: z.number().positive(),
        srvType: z.string().default("g"),
        fats: gramsField,
        carbs: gramsField,
        prots: gramsField,
        shared: z.boolean().default(false),
      },
    },
    async ({ name, srvSize, srvType, fats, carbs, prots, shared }) => {
      const food = store.addFood({ name, srvSize, srvType, fats, carbs, prots, shared });
      return result({ ...food });
    },
  );

  // 5. Log a food to a day (the Today table).
  server.registerTool(
    "log_food",
    {
      title: "Log a food for a day",
      description:
        "Log a food to a day's tracker, scaled by number of servings. Either " +
        "pass a saved `foodId`, or an ad-hoc `name` plus per-serving macros. " +
        "Date defaults to today.",
      inputSchema: {
        date: z.string().regex(DATE_RE).optional(),
        foodId: z.string().optional(),
        name: z.string().optional(),
        servings: z.number().positive().default(1),
        fats: gramsField.optional(),
        carbs: gramsField.optional(),
        prots: gramsField.optional(),
        srvSize: z.number().positive().optional(),
        srvType: z.string().optional(),
      },
    },
    async (args) => {
      const date = args.date ?? today();
      const servings = args.servings;

      let base: { name: string; fats: number; carbs: number; prots: number; srvSize: number; srvType: string; foodId: string | null };
      if (args.foodId) {
        const food = store.getFood(args.foodId);
        if (!food) return failure(`No saved food with id "${args.foodId}".`);
        base = { name: food.name, fats: food.fats, carbs: food.carbs, prots: food.prots, srvSize: food.srvSize, srvType: food.srvType, foodId: food.id };
      } else if (args.name && args.fats !== undefined && args.carbs !== undefined && args.prots !== undefined) {
        base = { name: args.name, fats: args.fats, carbs: args.carbs, prots: args.prots, srvSize: args.srvSize ?? 1, srvType: args.srvType ?? "serving", foodId: null };
      } else {
        return failure("Provide either `foodId`, or `name` with `fats`, `carbs`, and `prots`.");
      }

      const entry = store.addEntry({
        date,
        foodId: base.foodId,
        name: base.name,
        servings,
        srvSize: base.srvSize,
        srvType: base.srvType,
        fats: round(base.fats * servings, 1),
        carbs: round(base.carbs * servings, 1),
        prots: round(base.prots * servings, 1),
      });
      return result({ entry });
    },
  );

  // 6. Log a daily weigh-in.
  server.registerTool(
    "log_weight",
    {
      title: "Log daily weight",
      description:
        "Record a weigh-in for a day and (optionally) a goal weight. " +
        "Date defaults to today.",
      inputSchema: {
        date: z.string().regex(DATE_RE).optional(),
        weight: z.number().positive(),
        weightGoal: z.number().positive().optional(),
      },
    },
    async ({ date, weight, weightGoal }) => {
      const day = store.setWeight(date ?? today(), weight, weightGoal);
      const weightToGoal =
        day.weight !== null && day.weightGoal !== null
          ? round(day.weight - day.weightGoal, 1)
          : null;
      return result({ date: day.date, weight: day.weight, weightGoal: day.weightGoal, weightToGoal });
    },
  );

  // 7. Roll a day up against its goal.
  server.registerTool(
    "get_day_totals",
    {
      title: "Get a day's totals",
      description:
        "Summarize a day: calories and macros consumed, current macro split, " +
        "calibrated targets, and how much is left to hit the goal. Goal params " +
        "default to 2000 kcal at the standard 25/55/20 split. Date defaults to today.",
      inputSchema: {
        date: z.string().regex(DATE_RE).optional(),
        calsGoal: z.number().positive().default(2000),
        calsExer: z.number().min(0).default(0),
        ...splitFields,
      },
    },
    async ({ date, calsGoal, calsExer, fperGoal, cperGoal, pperGoal }) => {
      const d = date ?? today();
      const day = store.getDay(d);
      const totals = computeDayTotals(d, day.entries, {
        calsGoal,
        calsExer,
        fperGoal: fperGoal ?? DEFAULT_SPLIT.fperGoal,
        cperGoal: cperGoal ?? DEFAULT_SPLIT.cperGoal,
        pperGoal: pperGoal ?? DEFAULT_SPLIT.pperGoal,
      });
      const weightToGoal =
        day.weight !== null && day.weightGoal !== null
          ? round(day.weight - day.weightGoal, 1)
          : null;
      return result({ ...totals, weight: day.weight, weightGoal: day.weightGoal, weightToGoal });
    },
  );
}

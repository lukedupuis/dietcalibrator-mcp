import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_SPLIT } from "../domain/calibrate.js";
import { computeDayTotals } from "../domain/totals.js";
import type { Store } from "../store/store.js";
import { today } from "../util/date.js";

export function registerPrompts(server: McpServer, store: Store): void {
  // A reusable prompt that primes the model to plan the rest of a day's meals
  // to hit the remaining calibrated targets, using the saved foods library.
  server.registerPrompt(
    "plan_day",
    {
      title: "Plan the rest of the day",
      description:
        "Build a meal plan for the remaining calories and macros of a day, " +
        "preferring foods from the saved library.",
      argsSchema: {
        date: z.string().optional(),
        calsGoal: z.string().optional(),
      },
    },
    ({ date, calsGoal }) => {
      const d = date || today();
      const goalCals = calsGoal ? Number(calsGoal) : 2000;
      const totals = computeDayTotals(d, store.getDay(d).entries, {
        calsGoal: goalCals,
        calsExer: 0,
        ...DEFAULT_SPLIT,
      });
      const foods = store
        .listFoods()
        .map((f) => `- ${f.name} (${f.srvSize}${f.srvType}): ${f.cals} kcal, ${f.fats}f/${f.carbs}c/${f.prots}p`)
        .join("\n");

      const { remaining } = totals;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Plan the rest of my day (${d}) so I hit my targets.\n\n` +
                `Remaining today: ${remaining.cals} kcal, ` +
                `${remaining.fats}g fat, ${remaining.carbs}g carbs, ${remaining.prots}g protein.\n\n` +
                `Prefer foods from my saved library:\n${foods}\n\n` +
                `Propose specific foods and serving counts that land close to the ` +
                `remaining calories and macros. Show the running totals as you go, ` +
                `and call out any target you can't hit with the library.`,
            },
          },
        ],
      };
    },
  );
}

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { DEFAULT_SPLIT } from "../domain/calibrate.js";
import { computeDayTotals } from "../domain/totals.js";
import type { Store } from "../store/store.js";

/** Standard read-only goal used when rendering a day as a resource. */
const RESOURCE_GOAL = { calsGoal: 2000, calsExer: 0, ...DEFAULT_SPLIT };

export function registerResources(server: McpServer, store: Store): void {
  // The whole saved Foods table, as a browsable resource.
  server.registerResource(
    "saved-foods",
    "foods://saved",
    {
      title: "Saved foods",
      description: "The saved foods library with per-serving macros and calories.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(store.listFoods(), null, 2),
        },
      ],
    }),
  );

  // One day's log + totals, addressable by date: diet://day/2026-07-17
  server.registerResource(
    "day-log",
    new ResourceTemplate("diet://day/{date}", {
      list: async () => ({
        resources: store.listDates().map((date) => ({
          uri: `diet://day/${date}`,
          name: `Day ${date}`,
          mimeType: "application/json",
        })),
      }),
    }),
    {
      title: "Daily log",
      description:
        "A single day's logged foods plus totals against the default 2000 kcal goal.",
      mimeType: "application/json",
    },
    async (uri, { date }) => {
      const d = String(date);
      const day = store.getDay(d);
      const totals = computeDayTotals(d, day.entries, RESOURCE_GOAL);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              { date: d, weight: day.weight, weightGoal: day.weightGoal, entries: day.entries, totals },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}

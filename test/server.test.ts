import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import { Store } from "../src/store/store.js";

/** Spin up a real client wired to the server over an in-memory transport. */
async function connect() {
  const store = new Store({ filePath: null });
  const server = createServer(store);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { client, store };
}

function structured<T = Record<string, unknown>>(res: { structuredContent?: unknown }): T {
  return res.structuredContent as T;
}

describe("MCP server", () => {
  let client: Client;

  beforeEach(async () => {
    ({ client } = await connect());
  });

  it("advertises all seven tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "calc_food_calories",
        "calibrate_macros",
        "get_day_totals",
        "log_food",
        "log_weight",
        "save_food",
        "search_foods",
      ].sort(),
    );
  });

  it("advertises resources and the plan_day prompt", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("foods://saved");
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain("plan_day");
  });

  it("calc_food_calories returns Atwater calories", async () => {
    const res = await client.callTool({
      name: "calc_food_calories",
      arguments: { fats: 10, carbs: 20, prots: 30 },
    });
    expect(structured(res).cals).toBe(290);
  });

  it("calibrate_macros returns gram targets", async () => {
    const res = await client.callTool({
      name: "calibrate_macros",
      arguments: { calsGoal: 2000 },
    });
    const s = structured(res);
    expect(s.fatGrams).toBe(55.6);
    expect(s.carbGrams).toBe(275);
    expect(s.protGrams).toBe(100);
  });

  it("search_foods finds a seeded food", async () => {
    const res = await client.callTool({
      name: "search_foods",
      arguments: { query: "salmon" },
    });
    expect(structured<{ count: number }>(res).count).toBe(1);
  });

  it("logs a saved food and reflects it in the day totals", async () => {
    // Find a saved food id via search.
    const search = await client.callTool({
      name: "search_foods",
      arguments: { query: "chicken breast" },
    });
    const foodId = structured<{ foods: { id: string }[] }>(search).foods[0].id;

    await client.callTool({
      name: "log_food",
      arguments: { date: "2026-07-17", foodId, servings: 2 },
    });

    const totals = await client.callTool({
      name: "get_day_totals",
      arguments: { date: "2026-07-17", calsGoal: 2000 },
    });
    const s = structured<{ entryCount: number; consumed: { prots: number } }>(totals);
    expect(s.entryCount).toBe(1);
    expect(s.consumed.prots).toBe(62); // 31g protein * 2 servings
  });

  it("rejects log_food with neither a foodId nor inline macros", async () => {
    const res = await client.callTool({
      name: "log_food",
      arguments: { servings: 1 },
    });
    expect(res.isError).toBe(true);
  });

  it("reads the saved-foods resource", async () => {
    const res = await client.readResource({ uri: "foods://saved" });
    const foods = JSON.parse(res.contents[0].text as string);
    expect(Array.isArray(foods)).toBe(true);
    expect(foods.length).toBeGreaterThan(10);
  });

  it("reads a day-log resource by date", async () => {
    const res = await client.readResource({ uri: "diet://day/2026-07-17" });
    const day = JSON.parse(res.contents[0].text as string);
    expect(day.date).toBe("2026-07-17");
    expect(day.totals).toBeTruthy();
  });

  it("renders the plan_day prompt with remaining targets", async () => {
    const res = await client.getPrompt({ name: "plan_day", arguments: { calsGoal: "2000" } });
    const text = (res.messages[0].content as { text: string }).text;
    expect(text).toContain("Remaining today");
  });
});

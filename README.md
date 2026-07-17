# dietcalibrator-mcp

[![CI](https://github.com/lukedupuis/dietcalibrator-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/lukedupuis/dietcalibrator-mcp/actions/workflows/ci.yml)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the
**DietCalibrator** nutrition engine — Atwater calorie math, macro calibration, and daily
food logging — to any MCP client (Claude Code, Claude Desktop, …) as
**tools, resources, and prompts**.

It's a small, self-contained dev tool: the calibration logic is a faithful port of a real
app I built ([dietcalibrator.com](https://www.dietcalibrator.com)), and it ships with a
bundled foods library so it **runs cold — no database, no API keys, no credentials.**

```bash
npm install
npm test
npm run build
```

## What it does

DietCalibrator's job is to turn a calorie goal into concrete daily targets and track a day
of eating against them. This server exposes that engine:

| Primitive | Name | Purpose |
|-----------|------|---------|
| tool | `calc_food_calories` | Macros → calories (Atwater) + macro % breakdown |
| tool | `calibrate_macros` | Calorie goal + %-split → gram targets per macro |
| tool | `search_foods` | Search the saved foods library by name |
| tool | `save_food` | Add a food (calories derived from macros) |
| tool | `log_food` | Log a food to a day, scaled by servings |
| tool | `log_weight` | Record a daily weigh-in + goal weight |
| tool | `get_day_totals` | A day's consumed / current split / remaining-to-goal |
| resource | `foods://saved` | The saved foods library, as JSON |
| resource | `diet://day/{date}` | One day's log + totals, addressable by date |
| prompt | `plan_day` | Primes the model to fill the day's remaining targets |

## The domain math

Three ideas from the original app, ported verbatim and unit-tested:

- **Atwater factors** — calories per gram: fat 9, carb 4, protein 4.
  `cals = fats·9 + carbs·4 + prots·4`.
- **Calibration** — the namesake. A calorie goal at a macro percentage split becomes gram
  targets: `grams = calsGoal · (percent/100) / caloriesPerGram`. Default split is
  **25% fat / 55% carb / 20% protein**.
- **Largest-remainder macro %** — reporting each macro's share of calories as tenths of a
  percent that sum to *exactly* 100.0 (naive rounding drifts to 99.9/100.1). See
  [`src/domain/calories.ts`](src/domain/calories.ts).

## Try it

**1. Run the tests** — the fastest proof the whole thing works (domain math, store, and a real
MCP client↔server round-trip):

```bash
npm install
npm test
```

**2. Call a tool from the command line** — deterministic, no browser, one command each:

```bash
npm run build
# list the tools
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list
# calibrate 2000 kcal at the default split
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name calibrate_macros --tool-arg calsGoal=2000
# read the bundled foods library
npx @modelcontextprotocol/inspector --cli node dist/index.js --method resources/read --uri foods://saved
```

**3. Use it from an MCP client** (Claude Code / Claude Desktop) — the real experience. With the
Claude Code CLI:

```bash
claude mcp add dietcalibrator -- node /absolute/path/to/dietcalibrator-mcp/dist/index.js
```

…or register it by hand:

```jsonc
// .mcp.json (project) or your Claude Desktop config
{
  "mcpServers": {
    "dietcalibrator": {
      "command": "node",
      "args": ["/absolute/path/to/dietcalibrator-mcp/dist/index.js"]
    }
  }
}
```

Then ask the model things like *"calibrate 2200 calories at 30/40/30, log 2 servings of chicken
breast, and show my day's totals."*

<details>
<summary>Optional: the MCP Inspector web UI</summary>

`npm run inspector` builds and launches the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)'s
browser UI against `dist/index.js` over stdio (Transport **STDIO**, Command `node`, Arguments
`dist/index.js`, then **Connect**). It's handy for clicking through tools, but its browser
Connect step can be unreliable on some setups — if it hangs, use the deterministic **`--cli`**
commands above, which exercise the exact same server.

</details>

## Data & persistence

State (saved foods + daily logs) persists to a single JSON file. By default that's
`~/.dietcalibrator-mcp/data.json`; override it with the `DIETCALIBRATOR_DATA_FILE`
environment variable. On first run the foods library is seeded from
[`src/data/foods.seed.ts`](src/data/foods.seed.ts).

## Development

```bash
npm run dev         # run from source over stdio (tsx)
npm run typecheck   # tsc --noEmit
npm test            # vitest (domain math + store + full MCP client↔server)
npm run build       # emit dist/
```

The test suite includes an in-process integration test that drives the real server through
an MCP `Client` over an in-memory transport — see [`test/server.test.ts`](test/server.test.ts).

Design notes and trade-offs live in [ARCHITECTURE.md](ARCHITECTURE.md).

## License

MIT © Luke Dupuis

# dietcalibrator-mcp

[![CI](https://github.com/lukedupuis/dietcalibrator-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/lukedupuis/dietcalibrator-mcp/actions/workflows/ci.yml)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the
**DietCalibrator** nutrition engine — Atwater calorie math, macro calibration, and daily
food logging — to any MCP client (Claude Code, Claude Desktop, the MCP Inspector, …) as
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

## Use it from Claude Code

Build first (`npm run build`), then register the server:

```jsonc
// .mcp.json (project) or your Claude Desktop config
{
  "mcpServers": {
    "dietcalibrator": {
      "command": "node",
      "args": ["C:\\path\\to\\dietcalibrator-mcp\\dist\\index.js"]
    }
  }
}
```

Or run it against the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
without a build:

```bash
npm run inspector
```

Then ask the model things like *"calibrate 2200 calories at 30/40/30, then plan my day."*

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

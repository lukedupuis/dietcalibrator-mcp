# Architecture

The guiding constraint: a reviewer should be able to `git clone`, `npm install`, `npm test`,
and understand the whole thing without leaving the repo or holding any credentials. Every
decision below serves that.

## Layering

```
src/
  domain/     pure functions — the calorie/calibration/totals math (no I/O, no MCP)
  data/       bundled seed foods
  store/      persistence (JSON file or in-memory)
  mcp/        MCP wiring: tools, resources, prompts
  server.ts   composes a McpServer over a Store (transport-agnostic)
  index.ts    entry point: attaches a stdio transport
```

The **domain layer knows nothing about MCP or storage.** It's plain functions over plain
types, which is why it carries the bulk of the tests. The **MCP layer is thin** — each tool
validates input with Zod, calls a domain function or the store, and returns the result. This
split is deliberate: the load-bearing logic (the math) is tested directly and cheaply, and
the protocol wiring is exercised once, end-to-end, through a real client.

## Faithful port, not reinvention

The math mirrors the original DietCalibrator app so it's defensible, not plausible-sounding:

- `calcCalories` ← the `food.model.js` pre-save hook (`fats·9 + carbs·4 + prots·4`).
- `calibrateMacros` ← `TotalsModel.calculators.{fgGoal,cgGoal,pgGoal}`.
- `macroPercentages` ← `TotalsModel.calculatePercentages` — the **largest-remainder**
  apportionment that keeps the three macro percentages summing to exactly 100.0%. This is
  the one genuinely non-obvious algorithm here, and it has its own property test asserting
  the sum invariant across random inputs.

## Goals as query parameters, not stored state

A day's stored state is just its logged entries (and an optional weigh-in). The calorie goal
and macro split are passed **into** `get_day_totals` / the day resource rather than stored on
the day. Totals are therefore a pure view over `(entries, goal)` — no hidden mutation, no
"which goal was in effect when?" ambiguity, and the compute path stays a pure function that's
trivial to test. Defaults (2000 kcal, 25/55/20) apply when a caller omits them.

## Persistence

`Store` is intentionally tiny: a single JSON file read on construction and rewritten on each
mutation, or fully in-memory when `filePath: null` (how the tests run). Trade-offs, stated
plainly:

- **Synchronous file I/O and last-write-wins.** Fine for a single-client dev tool driven by
  one model; it is *not* safe for concurrent writers. A real deployment would swap this for a
  proper datastore behind the same `Store` interface — the seam is already there.
- **No migrations.** The seed only loads when the store is empty, so an existing data file is
  never clobbered.

## Structured output without `outputSchema`

Every tool returns both human-readable `content` (pretty JSON text) and machine-readable
`structuredContent`. I deliberately did **not** also declare a Zod `outputSchema` per tool:
it would add a second source of truth to keep in sync with the handler for little gain on a
demo of this size, and clients already receive typed structured data. Adding output schemas
(for stricter client-side validation) is the obvious next step if this grew up.

## Transport & testing

`index.ts` attaches a `StdioServerTransport` — the standard local-MCP transport a client
launches over stdin/stdout. Because `createServer(store)` is transport-agnostic, the tests
attach an `InMemoryTransport` linked pair and drive the server through a real MCP `Client`
(`test/server.test.ts`), covering tool calls, resource reads, and prompt rendering exactly as
a production client would — without spawning a process.

One stdio rule the entry point respects: **nothing goes to stdout except the JSON-RPC
stream.** All logging is on stderr.

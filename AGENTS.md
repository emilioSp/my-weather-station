# AGENTS.md

## Project Overview

Reads BLE advertisements from SwitchBot indoor and outdoor meters, stores them in
PostgreSQL, and shows them in a web app.

## General Principles

- KISS: Keep It Simple, Stupid. Code must be readable without comments.
- Solve only the problem at hand. No future-proofing. No Chinese boxes.
- Do not solve problems that you don't have. Don't add features that you don't need. Don't add abstractions that you don't need.
- Avoid comments unless absolutely necessary for clarity.
- Use descriptive variable and function names.

## Communication Rules

- Ask for confirmation on design decisions.
- Ask for clarification when requirements are unclear.
- When in doubt, ask.

## Repository layout

An npm workspaces monorepo with three workspaces:

- `apps/collector` (`@wx/collector`) - the BLE collector daemon.
- `apps/web` (`@wx/web`) - the React + Vite web app, reading Supabase from the browser.
- `packages/shared` (`@wx/shared`) - code both apps need.

### Workspaces

- The `workspaces` field in the root `package.json` holds directory globs, not names. To add
  a workspace, create the directory with its own `package.json`. Do not edit the root file.
- The root `package.json` holds no runtime dependency. Add each one to the workspace that
  uses it: `npm install <pkg> -w @wx/web`.
- A script that concerns one workspace belongs to that workspace and runs with `-w`. The root
  keeps only `lint`, `build`, `dev` and `test`, which act on every workspace.
- Exception: `allowScripts` stays in the root `package.json`. npm ignores it inside a
  workspace and warns to move it back, because there is one `node_modules` and one dependency
  tree, so install-script policy is a property of the install.

### Imports

- Across workspaces, use the package name and declare `"@wx/shared": "*"` in the consumer.
- Inside a workspace, never climb with `../`. Use the `imports` field of that workspace's own
  `package.json`: `import { createMeter } from '#meters/meter.factory.ts'`.
- Never use `compilerOptions.paths`. Native type stripping ignores it, so the alias would not
  exist at runtime. Node subpath imports are real resolution and do.
- Import shared types from `@wx/shared` in every file that uses them. Do not re-export them
  from `apps/collector/types.ts`: the import line should say where a type comes from.

### packages/shared

- It holds what both apps need: the domain schemas describing a stored row, the case mapper,
  and `normalizeUuid`. Anything describing BLE or the collector configuration stays out.
- It must contain no platform code. Its `tsconfig.json` declares no `types` and no DOM `lib`,
  so a `Buffer` or a `document` fails the type check rather than reaching the browser.
- It publishes TypeScript sources through `exports`, with no build output. This works because
  Node strips types from the real path behind the workspace symlink, and Vite bundles the
  source.

### Files the collector owns

- `.env`, `.env.local`, `Dockerfile`, `Dockerfile.dockerignore`, `docker-compose.yml`,
  `knexfile.js` and `migrations/` all live in `apps/collector`. The root holds only what is
  shared.
- The Docker build context stays the repository root, because the lockfile and
  `packages/shared` are there. `docker-build-and-push` therefore passes `../..`, and the
  ignore file must be named `Dockerfile.dockerignore`: Docker looks for a plain
  `.dockerignore` in the context root, so one inside `apps/collector` would be ignored.
- `docker-compose.yml` pins `name: my-weather-station`. Without it, Compose derives the
  project name from the containing directory and switches to a different, empty volume.

## Architecture

Everything in this section is about `apps/collector` unless stated otherwise. Paths are
relative to that workspace.

### Entrypoint

`apps/collector/index.ts` is the startup and presentation layer. It:

- reads the validated device configuration from `environment.ts`;
- asks `createMeter()` for the correct meter strategy;
- calls the strategy's `read()` method;
- prints the stored measures returned by the strategies with `console.log`.

The entrypoint must not contain meter-specific conditionals or BLE protocol logic.

### Meters

`meters/` contains the business logic that converts advertisements into measures.

Each meter type is represented by a strategy class:

- `meters/OutdoorMeter.ts` implements the outdoor SwitchBot protocol;
- `meters/IndoorMeter.ts` implements the indoor SwitchBot protocol;
- both extend `meters/Meter.ts` and implement `MeterInterface` from `types.ts`;
- `MeterInterface` exposes `getMeter()` and `read()`.

`meters/meter.factory.ts` contains `createMeter(meter)`. The factory selects and returns the correct strategy based on `meter.type`. The shared `Meter` class reads advertisements, decodes a complete reading, creates derived values, stores the measure, and returns it.

Only strategy interface methods are public. Meter-specific decoding and state management stay in non-public class methods.

### API

`api/` contains interactions with external resources.

`api/sensor.api.ts` is the BLE boundary. It manages Noble scanning, finds peripherals, and converts BLE data into a generic `Advertisement`. It does not contain meter decoding rules.

### Database

`db/` manages the database used by this software.

`db/db.ts` owns the Knex connection and the pg type parsers. It does not map identifiers.

`db/measure.repository.ts` stores completed measures and returns the inserted row in domain
case. It maps the case at the boundary with `toSnakeCaseKeys` and `toCamelCaseKeys` from
`@wx/shared`. Never move this back into the Knex `wrapIdentifier` and `postProcessResponse`
hooks: the mapping must also apply to the rows PostgREST returns to the web app.

### Errors

`errors/` contains domain errors. `errors/NoCompleteReadingError.ts` represents a meter that did not produce a complete reading within the configured scan attempts.

### Utilities and configuration

- `packages/shared/` contains `normalizeUuid` and the camelCase/snake_case mapper.
- `meters/utils/calculateDewPoint.util.ts`, `meters/utils/calculateHeatIndex.util.ts`, and `meters/utils/formatMeasure.util.ts` contain shared measurement calculations and formatting.
- `environment.ts` validates the collector environment variables with Zod.
- `types.ts` contains the schemas that only the collector uses: BLE advertisements and the
  meter configuration. Everything the web app also needs lives in `@wx/shared`.

### Data flow

```text
apps/collector/index.ts
  -> meters/meter.factory.ts
  -> MeterInterface strategy
     -> meters/OutdoorMeter.ts or meters/IndoorMeter.ts
        -> api/sensor.api.ts
           -> @stoprocent/noble
        -> db/measure.repository.ts
           -> db/db.ts
              -> PostgreSQL
        -> errors/NoCompleteReadingError.ts
```

### Web app

`apps/web` has no server. `supabase.api.ts` is the only boundary to Supabase and returns rows
already converted to domain case. `environment.ts` validates the two `VITE_` variables with
Zod at startup, the same way the collector validates its own.

```text
main.tsx
  -> App.tsx
     -> supabase.api.ts
        -> @supabase/supabase-js -> PostgREST -> PostgreSQL
```

### Component identification

- API modules use the `.api.ts` suffix.
- Strategy classes use PascalCase file names: `OutdoorMeter.ts`, `IndoorMeter.ts`.
- Factories use the `.factory.ts` suffix.
- Repositories use the `.repository.ts` suffix.
- Errors use PascalCase file names ending in `Error.ts`.
- Utilities use the `.util.ts` suffix.

### types
- private types? --> Put them directly in the module they are used
- public types? --> Put them in `packages/shared/types.ts` when both the collector and the web
  app need them, otherwise in `apps/collector/types.ts`. The test is the database: a type that
  describes a stored row is shared, a type that describes BLE or the collector configuration
  is not. `packages/shared` compiles without `@types/node`, so a `Buffer` in a shared type
  fails the type check instead of leaking to the browser.
- Environment variables are validated with Zod in `apps/collector/environment.ts`, which is loaded at startup.

## TypeScript & Coding Conventions

- ESM only - CommonJS is forbidden. Use `import`/`export`, never `require`/`module.exports`.
- `type` over `interface` for TypeScript types.
- Zod type inference for types shared across layers; dedicated types for layer-internal use.
- Arrow functions preferred for functions. Classes are used for meter strategies and objects that maintain internal state.
- Named exports preferred. Default exports only for app entrypoint, singletons, and db connection.
- Pure functions preferred. Functions should do one thing only.
- For datetime always use Temporal. It's native since we are on Node 26+.
- Small functions - when they grow beyond ~50 lines, consider breaking them down.
- `async/await` always - never use callbacks. If forced, wrap with `node:util` `promisify`.
- Named parameters - use object destructuring instead of positional parameters. Define a named `type` for the input object and for the return value when returning multiple values or a complex object. Instead, for simple functions that return a single primitive value, do not use a named types.
e.g.
```typescript
type CalculateGapInput = {
  playerLapTime: number;
  targetLapTime: number;
}; 
type CalculateGapOutput = {
  value: number;
  unit: 'seconds';
};

const calculateGap = ({ playerLapTime, targetLapTime }: CalculateGapInput): CalculateGapOutput => {
  const value = playerLapTime - targetLapTime;
  return { value, unit: 'seconds' };
};

const speedUp = (currentSpeed: number): number => {
  return currentSpeed + 10;
};
```
- Named parameters must be defined close to the function they serve.
- Use explicit methods instead of property accessor syntax.
   - Use `getTemperature()`.
   - Do not use `get getTemperature()` or `set setTemperature()`.

## Testing

- Unit tests only for complex pure functions/algorithms, integration tests for feature flows (prefer over unit tests)
- Use one fixture for one scenario.
   - Make the scenario clear from the file name.
   - Do not hide scenarios in frame indexes.
- Do not write clever test helpers. Be stupid and explicit.
- Make test setup explicit.
   - Load the required fixture inside the test when possible.
   - Do not put a default fixture in `beforeEach` when only some tests need it: a code reader must see the test input without searching for hidden setup.
- Use clear test names.
   - Use Given template
   - Example: when X reports Y, then the Z happens.
- Avoid redundant expectations.
   - One expectation must prove one behavior.
   - Remove a second expectation when the first one already proves the same result.
   - Keep an explicit exclusion check when exclusion is the behavior under test.
- Do not write meaningless tests, that add no coverage or behavior value.
   - Measure coverage before and after removal.
   - Remove the unused fixture with the test.
- Run the full test command.
   - A single test file can pass but fail the global coverage thresholds.
   - Use `npm test` for final verification.
- Run all final checks from the repository root:
   - `npm run lint`
   - `npm run build` - type checks every workspace and builds the web app
   - `npm test` - no test runner is configured yet, so this currently fails by design.
     Configure one before relying on it.

## Database
- Always use migrations with knex: `npm run new:migration -w @wx/collector -- <name>`. They live in `apps/collector/migrations`.
- Always write migrations in raw SQL. Don't use other knex functions

## Documentation

The `README.md` must include:

1. What the software does.
2. Prerequisites.
3. Local development setup.
4. Local testing instructions.
5. Deployment instructions (if applicable). If deploy does not exist, then skip this section
# AGENTS.md

## Project Overview

Reads BLE advertisements from SwitchBot indoor and outdoor meters

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

## Architecture
### entrypoint
- `src/crawler/index.ts`: starts the connection to devices.
- `src/crawler/index.ts` is also the presentation layer. Use `console.log`.

### internal components
- utils: in the src/crawler folder. It contain function used in other modules. E.g. normalizeUuid
- services: in the src/crawler folder. They contain the business logic. Pure functions. E.g. measures
- repositories: in the src/crawler folder. They are modules that interact directly with BLE devices. E.g. indoorMeter

The data flow is
index.ts -> services -> repositories

### components identification
use suffix to identify different type of modules.
For instance:
- `src/crawler/index.ts`
- `src/crawler/normalizeUuid.util.ts`
- `src/crawler/outdoorMeter.service.ts`
- `src/crawler/indoorMeter.repository.ts`
- `src/crawler/meter.repository.ts`

### types
- private types? --> Put them directly in the module they are used
- public types? --> Put them in src/crawler/types.ts
- env file variables are checked at the startup (in the entrypoint), using zod.

## TypeScript & Coding Conventions

- **ESM only** - CommonJS is forbidden. Use `import`/`export`, never `require`/`module.exports`.
- **`type` over `interface`** for TypeScript types.
- **Zod type inference** for types shared across layers; dedicated types for layer-internal use.
- **Arrow functions** preferred over classes. Classes only when maintaining internal state.
- **Named exports** preferred. Default exports only for app entrypoint, singletons, and db connection.
- **Pure functions** preferred. Functions should do one thing only.
- **Small functions** - when they grow beyond ~40 lines, consider breaking them down.
- **`async/await` always** - never use callbacks. If forced, wrap with `node:util` `promisify`.
- **Named parameters** - use object destructuring instead of positional parameters. Define a named `type` for the input object and for the return value when returning multiple values or a complex object. Instead, for simple functions that return a single primitive value, do not use a named types.
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
   - Do not put a default fixture in `beforeEach` when only some tests need it.
   - A reader must see the test input without searching for hidden setup.
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
- Run all final checks.
   - `npm test`
   - `npm run build`
   - `npm run lint`


## Documentation

The `README.md` must include:

1. What the software does.
2. Prerequisites.
3. Local development setup.
4. Local testing instructions.
5. Deployment instructions (if applicable). If deploy does not exist, then skip this section
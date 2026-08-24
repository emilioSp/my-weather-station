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

### Entrypoint

`src/crawler/index.ts` is the startup and presentation layer. It:

- reads the validated device configuration from `environment.ts`;
- asks `createMeter()` for the correct meter strategy;
- calls the strategy's `read()` method;
- prints the collected readings with `console.log`.

The entrypoint must not contain meter-specific conditionals or BLE protocol logic.

### Strategy pattern

Each meter type is represented by a strategy class:

- `OutdoorMeter.ts` implements the outdoor SwitchBot protocol;
- `IndoorMeter.ts` implements the indoor SwitchBot protocol;
- both implement `MeterInterface` from `types.ts`;
- `MeterInterface` exposes `getMeter()` and `read()`.

`meter.factory.ts` contains `createMeter(meter)`. The factory selects and returns the correct strategy based on `meter.type`. This keeps type selection out of the entrypoint and makes each class responsible for its own decoding and reading behavior.

Only strategy interface methods are public. Meter-specific decoding and state management stay in private class methods.

### Repository

`meter.repository.ts` is the BLE boundary. It manages Noble scanning, finds peripherals, and converts BLE data into a generic `MeterAdvertisement`. It does not contain outdoor or indoor decoding rules.

### Utilities and configuration

- `normalizeUuid.util.ts` contains shared UUID normalization.
- `environment.ts` validates global environment variables with Zod.
- `types.ts` contains public schemas and types shared across modules.

### Data flow

```text
index.ts
  -> meter.factory.ts
  -> MeterInterface strategy
     -> OutdoorMeter.ts or IndoorMeter.ts
     -> meter.repository.ts
        -> @stoprocent/noble
```

### Component identification

- Strategy classes use PascalCase file names: `OutdoorMeter.ts`, `IndoorMeter.ts`.
- Factories use the `.factory.ts` suffix.
- Repositories use the `.repository.ts` suffix.
- Utilities use the `.util.ts` suffix.

### types
- private types? --> Put them directly in the module they are used
- public types? --> Put them in src/crawler/types.ts
- Environment variables are validated with Zod in `src/crawler/environment.ts`, which is loaded at startup.

## TypeScript & Coding Conventions

- ESM only - CommonJS is forbidden. Use `import`/`export`, never `require`/`module.exports`.
- `type` over `interface` for TypeScript types.
- Zod type inference for types shared across layers; dedicated types for layer-internal use.
- Arrow functions preferred for functions. Classes are used for meter strategies and objects that maintain internal state.
- Named exports preferred. Default exports only for app entrypoint, singletons, and db connection.
- Pure functions preferred. Functions should do one thing only.
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
# AGENTS.md

## Project overview

My Weather Station reads SwitchBot meters, stores measurements in PostgreSQL, and shows them in a web app.

## General principles

- Keep code simple and readable.
- Solve only the current problem.
- Do not add future features, abstractions, or dependencies without a need.
- Avoid comments unless they add necessary clarity.
- Use descriptive names.

## Communication

- Ask for confirmation on design decisions.
- Ask for clarification when requirements are unclear.
- Do not install packages without confirmation.

## Workspaces

This repository is an npm workspaces monorepo:

- `apps/collector` (`@wx/collector`) reads meters and stores measurements. Specific instructions [collector AGENTS.md](./apps/collector/AGENTS.md)
- `apps/web` (`@wx/web`) is the React and Vite web app. Specific instructions [web AGENTS.md](./apps/web/AGENTS.md)
- `packages/shared` (`@wx/shared`) contains code used by both apps.

The root `package.json` contains workspace globs, root scripts, development tools, and the install-script policy. Add runtime dependencies to the workspace that uses them. Keep `allowScripts` in the root `package.json`.

A workspace script runs with its workspace name:

```sh
npm run <script> -w <workspace-name>
```

## Imports and shared code

- Import code from another workspace by package name. Declare the dependency in the consumer workspace.
- Inside a workspace, use its `imports` field. Do not use relative paths that leave the workspace.
- `packages/shared` owns stored-row domain schemas, case mapping, and UUID normalization.
- Shared code must not contain browser or Node platform types and APIs.
- Types that describe stored rows belong in `packages/shared/types.ts`. Types used by one workspace stay in that workspace.

## TypeScript conventions

- Use ESM only. Do not use CommonJS.
- Prefer `type` over `interface`.
- Use Zod inference for shared schema types.
- Prefer named exports. Use a default export only when a tool requires it or for a single application entrypoint or singleton.
- Prefer pure functions.
- Prefer arrow functions. Use classes only for strategies or objects with internal state.
- Keep functions small. Split a function when it becomes hard to read.
- Use `async` and `await`. Do not introduce callback APIs.
- Use named parameters for functions with multiple inputs. Define the input type close to the function.
- Use explicit methods. Do not use property accessors.
- Do not use --experimental-strip-types. We run on node version that support TypeScript stripping by default.

## Testing and checks

- Test complex pure logic with unit tests.
- Prefer integration tests for feature flows.
- Use one clear fixture for one scenario. Make the scenario clear from the file name.
- Do not write clever test helpers.
- Make test setup explicit. Load a fixture inside a test when possible. Do not hide default fixtures in `beforeEach`.
- Use test names that state the given condition and result.
- Keep each assertion meaningful. Remove redundant assertions, except explicit exclusion checks.
- Do not add tests without behavior value. Check coverage before removing tests and fixtures.
- Run final checks from the repository root:

```sh
npm run lint
npm run build
npm test
```

`npm test` currently fails because no test runner is configured. Record this result when relevant.

## Documentation

The root `README.md` must describe:

1. What the software does.
2. Prerequisites.
3. Local development setup.
4. Local testing instructions.
5. Deployment instructions when deployment exists.

## Workflow
IMPORTANT: you work stricly following this [workflow](AGENTS_WORKFLOW_CONTRIBUTING.md)
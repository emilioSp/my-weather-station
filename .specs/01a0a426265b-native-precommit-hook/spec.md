# 01a0a426265b-native-precommit-hook: Native pre-commit hook

## Problem

The repository has no pre-commit check. A commit must run read-only lint and TypeScript checks. The Maestro must not start a builder or verifier while the native hook is inactive.

## Constraints

- No new dependencies.
- Use Git native hooks, not Husky.
- Keep the existing `build` and `test` workflow checks.
- The hook must not modify tracked files.

## Allowed paths

- `package.json`
- `.githooks/pre-commit`
- `AGENTS_CONTRIBUTING.md`
- `README.md`
- `.specs/01a0a426265b-native-precommit-hook/**`

## Technical details

Add a versioned executable hook in `.githooks/`. Add root scripts for read-only Biome linting, automatic Biome fixes, TypeScript checks, and the combined pre-commit check. The hook runs the combined check.

Before a Maestro creates a worktree or launches a builder or verifier, it verifies that `core.hooksPath` is `.githooks` and that `.githooks/pre-commit` is executable. If either check fails, it reports the command needed to activate the hook to the owner and stops.

Document the one-time activation command in the local setup instructions.

## Acceptance criteria

### AC1: The versioned pre-commit hook runs read-only lint and TypeScript checks.

- probe: `git diff --exit-code && ./.githooks/pre-commit && git diff --exit-code`
- postcondition: the repository passes the hook and the hook leaves no tracked-file change.
- breakage: replace the hook command with `npm run lint:fix`; the final `git diff --exit-code` fails when Biome formats an unformatted tracked source file.

### AC2: The root pre-commit command checks every workspace TypeScript configuration without emitting files.

- probe: `npm run typecheck && git diff --exit-code`
- postcondition: TypeScript accepts the collector, web, and shared workspace sources and leaves no tracked-file change.
- breakage: add a deliberate invalid type assignment to one workspace source file; `npm run typecheck` fails.

### AC3: The Maestro blocks agent launches when the hook is inactive.

- probe: `test "$(git config --get core.hooksPath)" = .githooks && test -x .githooks/pre-commit`
- postcondition: the configured Git hook path is `.githooks` and the pre-commit hook is executable before an agent launch.
- breakage: run `git config --unset core.hooksPath`; the probe fails.

### AC4: Local setup documents the hook activation command.

- probe: `rg -F 'git config core.hooksPath .githooks' README.md`
- postcondition: a developer can find the one-time hook activation command in the root setup documentation.
- breakage: remove the command from `README.md`; the probe finds no match.

## Out of scope

- Husky, lint-staged, or another hook dependency.
- Replacing the workflow checks run by builders and verifiers.
- A remote CI pipeline.

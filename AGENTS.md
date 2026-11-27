# AGENTS.md

## Project overview

My Weather Station reads SwitchBot meters, stores measurements in PostgreSQL, and shows them in a web app.

## Project documentation

Read [CHANGELOG.md](CHANGELOG.md), the [roadmap index](docs/roadmap/README.md), and the [ADR index](docs/adr/README.md) at session start. Read individual records when
relevant.

- Keep one file per roadmap item and per ADR, with stable IDs and status in front matter. Keep the indexes in sync.
- Roadmap items use **Objective** and **Completed When**. Update only items relevant to the work, link the specification when one exists, and record completion only after
  owner acceptance.
- ADRs use **Context**, **Decision**, an optional **Alternatives considered**, and **Consequences**. Record only significant architectural decisions. When replacing a
  decision, link the old and new records.

## Workspaces

This repository is an npm workspaces monorepo:

1. `packages/collector` (`@wx/collector`) reads meters and stores measurements. See [collector AGENTS.md](./packages/collector/AGENTS.md).
2. `packages/web` (`@wx/web`) is the React and Vite web app. See [web AGENTS.md](./packages/web/AGENTS.md).
3. `packages/shared` (`@wx/shared`) contains shared domain code, the Node-only database client, and database migrations.
4. `packages/api` (`@wx/api`) is the Hono backend for weather measurements.

The root `package.json` contains workspace globs, root scripts, development tools, and the install-script policy. Add runtime dependencies to the workspace that uses
them. Keep `allowScripts` in the root `package.json`.

Run a workspace script with its workspace name:

```sh
npm run <script> -w <workspace-name>
```

## Imports and shared code

1. Import code from another workspace by package name. Declare the dependency in the consumer workspace.
2. Inside a workspace, use its `imports` field. Do not use relative paths that leave the workspace.
3. `packages/shared` owns stored-row domain schemas and UUID normalization.
4. Shared domain code must stay platform-neutral. `@wx/shared/db.ts` and `@wx/shared/shared-environment.ts` are Node-only exports for the API and collector. Do not import
   them from the web app.
5. Types that describe stored rows belong in `packages/shared/types.ts`. Types used by one workspace stay in that workspace.
6. Use Zod inference for shared schema types.
7. Store PostgreSQL migrations in `packages/shared/migrations/`. Write migrations as raw SQL through Knex and keep existing migration filenames unchanged.

## Validation

After task-specific checks, run this additional validation from the repository root before reporting completion:

```sh
npm run check
```

This command runs lint, TypeScript checks, tests, and coverage across all workspaces, including the web browser tests. It does not replace task-specific checks. If it
fails, report the failure and do not claim that validation passed.

If a change on the UI is needed then, regenerate visual snapshots and then test it with

```sh
npm run test:visual -w @wx/web
```

If you only change documentation, just run

```sh
npm run fmt
```

# AGENTS.md

## Project overview

My Weather Station reads SwitchBot meters, stores measurements in PostgreSQL, and shows them in a web app.

## Workspaces

This repository is an npm workspaces monorepo:

1. `packages/collector` (`@wx/collector`) reads meters and stores measurements. See [collector AGENTS.md](./packages/collector/AGENTS.md).
2. `packages/web` (`@wx/web`) is the React and Vite web app. See [web AGENTS.md](./packages/web/AGENTS.md).
3. `packages/shared` (`@wx/shared`) contains code used by both apps.

The root `package.json` contains workspace globs, root scripts, development tools, and the install-script policy.
Add runtime dependencies to the workspace that uses them. Keep `allowScripts` in the root `package.json`.

Run a workspace script with its workspace name:

```sh
npm run <script> -w <workspace-name>
```

## Imports and shared code

1. Import code from another workspace by package name. Declare the dependency in the consumer workspace.
2. Inside a workspace, use its `imports` field. Do not use relative paths that leave the workspace.
3. `packages/shared` owns stored-row domain schemas, case mapping, and UUID normalization.
4. Shared code must not contain browser or Node platform types and APIs.
5. Types that describe stored rows belong in `packages/shared/types.ts`. Types used by one workspace stay in that workspace.
6. Use Zod inference for shared schema types.

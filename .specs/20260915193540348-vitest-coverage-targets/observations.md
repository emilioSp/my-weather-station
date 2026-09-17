# Builder observations

## AC1

Breakage command: `find packages/collector -name '*.test.ts' -print0 | while IFS= read -r -d '' file; do mv "$file" "$file.disabled"; done; npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/collector`.

Output: exit 1. Vitest reported no test files and 0% statements, branches, functions, and lines; all global coverage thresholds failed.

Restored command: `npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/collector`.

Output: exit 0. 5 files / 12 tests passed. Coverage was statements 97.36%, branches 88.33%, functions 95.45%, and lines 100%. The repository test stores a complete measure, reads its returned camel-case and PostgreSQL snake-case rows, and its `afterEach` truncates `measures`. The meter database suite also truncates `measures` in `afterEach`.

## AC2

Breakage command: `find packages/shared -name '*.test.ts' -print0 | while IFS= read -r -d '' file; do mv "$file" "$file.disabled"; done; npm run test -w @wx/shared`.

Output: exit 1. Vitest reported no test files and 0% statements (0/26), branches (0/9), functions (0/12), and lines (0/25), with all configured threshold failures.

Restored command: `npm run test -w @wx/shared`.

Output: exit 0. 2 files / 8 tests passed. Coverage was statements 100%, branches 100%, functions 100%, and lines 100%.

## AC3

Breakage command: `find packages/web -name '*.test.ts' -print0 | while IFS= read -r -d '' file; do mv "$file" "$file.disabled"; done; npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/web`.

Output: exit 1. Playwright completed with 6 tests passed; Vitest then reported no test files and 0% statements, branches, functions, and lines, with all configured coverage threshold failures.

Restored command: `npm run supabase:start && npm run supabase:reset && npm run migrate:local -w @wx/collector && npm run test -w @wx/web`.

Output: exit 0. Playwright: 6 passed. Vitest: 4 files / 11 tests passed; statements 96.87%, branches 84.5%, functions 94.73%, and lines 96.8%. The real Supabase API test seeds three PostgreSQL measures, selects the newest indoor measure, confirms ordered indoor and outdoor history, and truncates `measures` in `afterEach`; its empty-database test also passed.

## Required checks

`npm run lint`: exit 0.

`npm run build`: exit 0. The web Vite build emitted its existing chunk-size warning.

`npm test`: exit 0; collector (5 files / 12 tests), shared (2 files / 8 tests), and web Playwright (6 tests) plus Vitest (4 files / 11 tests) passed.

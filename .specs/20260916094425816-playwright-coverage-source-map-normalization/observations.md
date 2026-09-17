# Builder observations

## AC1: Normalization removes merged source-map duplicates but preserves real uncovered handlers

Breakage applied: temporarily removed `normalizeFunctionCoverage(coverageMap);` before report generation.

### Stated probe with breakage

```sh
rm -rf packages/web/coverage && npm exec --workspace @wx/web -- vitest run --coverage --config vitest.config.ts && npm exec --workspace @wx/web -- playwright test && (npm exec --workspace @wx/web -- node e2e/utils/merge-coverage.ts || true) && (cd packages/web && node --input-type=module -e "const { readFile } = await import('node:fs/promises'); const coverage = JSON.parse(await readFile('coverage/coverage-final.json', 'utf8')); const entry = Object.entries(coverage).find(([path]) => path.endsWith('/components/primitives/Accordion.tsx')); if (entry === undefined) throw new Error('Accordion coverage is missing'); const [, data] = entry; const functions = Object.entries(data.fnMap).map(([id, value]) => ({ ...value, count: data.f[id] })); const hasDuplicate = functions.some((anonymous) => anonymous.name.startsWith('(anonymous_') && functions.some((named) => !named.name.startsWith('(anonymous_') && named.decl.start.line === anonymous.decl.start.line && named.decl.start.column === anonymous.decl.start.column)); if (hasDuplicate) throw new Error('Merged source-map duplicate remains'); if (!functions.some((value) => value.name === 'Accordion' && value.count > 0)) throw new Error('Executed component is missing'); if (!functions.some((value) => value.name === 'onClick' && value.count === 0)) throw new Error('Uncovered handler is missing');")
```

Output:

```text
Vitest: 4 passed, 11 passed.
Playwright: 6 passed.
Coverage summary:
Statements : 88.7% (1523/1717)
Branches   : 70.52% (213/302)
Functions  : 61.42% (86/140)
Lines      : 96.14% (1423/1480)
Error: functions: 61.42% is below 75%
Error: Merged source-map duplicate remains
exit 1
```

### Restored probe

Restored `normalizeFunctionCoverage(coverageMap);` before report generation and reran the stated probe.

Output:

```text
Vitest: 4 passed, 11 passed.
Playwright: 6 passed.
Coverage summary:
Statements : 88.7% (1523/1717)
Branches   : 70.52% (213/302)
Functions  : 76.54% (62/81)
Lines      : 96.14% (1423/1480)
exit 0
```

The artifact assertion completed successfully: no anonymous function shared a declaration position with a named function; `Accordion` had a positive counter; and `onClick` had a zero counter.

## Required repository checks

```sh
npm run lint
```

```text
Checked 90 files in 42ms. No fixes applied.
exit 0
```

```sh
npm run build
```

```text
Collector, shared, and web builds completed successfully.
Vite emitted its chunk-size warning for a 864.96 kB JavaScript asset.
exit 0
```

```sh
npm test
```

```text
Collector: 5 test files and 12 tests passed.
Shared: 2 test files and 8 tests passed.
Web: 4 Vitest files and 11 tests passed; 6 Playwright tests passed.
Merged web coverage: statements 88.7%, branches 70.52%, functions 76.54%, lines 96.14%.
exit 0
```

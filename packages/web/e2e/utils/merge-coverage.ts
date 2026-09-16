import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coverageThresholds } from '@wx/shared';
import type { CoverageMap, CoverageMapData } from 'istanbul-lib-coverage';
import coverageLib from 'istanbul-lib-coverage';
import reportLib from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const coverageDirectory = join(process.cwd(), 'coverage'); // directory for final coverage
const vitestCoveragePath = join(
  coverageDirectory,
  'vitest',
  'coverage-final.json',
);
const playwrightCoverageDirectory = join(coverageDirectory, 'playwright');

const readCoverage = async (path: string): Promise<CoverageMapData> =>
  JSON.parse(await readFile(path, 'utf8'));

const getE2ECoveragePaths = async (): Promise<string[]> => {
  const entries = await readdir(playwrightCoverageDirectory, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(playwrightCoverageDirectory, entry.name))
    .sort();
};

const isAnonymousFunction = (name: string): boolean =>
  name.startsWith('(anonymous_');

/*
 * `coverage-final.json` can have two entries for one arrow function.
 * Vitest and Playwright convert V8 coverage separately. Vitest can lose the
 * TypeScript variable name and write `(anonymous_n)`, while Playwright uses
 * the inferred source name. Istanbul then treats them as different functions
 * and counts one as falsely uncovered. Example: Vitest writes `(anonymous_0)`
 * and Playwright writes `Accordion` for `const Accordion = () => { ... }`.
 * Both entries point to the same source declaration. In `Accordion.tsx`,
 * Vitest records the component body as `(anonymous_0)` and the
 * `onClick={() => setIsOpen(!isOpen)}` callback as `(anonymous_1)`.
 */

const normalizeFunctionCoverage = (coverageMap: CoverageMap): void => {
  for (const path of coverageMap.files()) {
    const coverage = coverageMap.fileCoverageFor(path).data;
    const namedDeclarationPositions = new Set(
      Object.values(coverage.fnMap)
        .filter(
          (functionCoverage) => !isAnonymousFunction(functionCoverage.name),
        )
        .map(
          (functionCoverage) =>
            `${functionCoverage.decl.start.line}:${functionCoverage.decl.start.column}`,
        ),
    );

    for (const [id, functionCoverage] of Object.entries(coverage.fnMap)) {
      const declarationPosition = `${functionCoverage.decl.start.line}:${functionCoverage.decl.start.column}`;

      if (
        isAnonymousFunction(functionCoverage.name) &&
        namedDeclarationPositions.has(declarationPosition)
      ) {
        delete coverage.fnMap[id];
        delete coverage.f[id];
      }
    }
  }
};

const checkCoverageThresholds = (coverageMap: CoverageMap): void => {
  const summary = coverageMap.getCoverageSummary();
  const metrics = Object.keys(coverageThresholds) as Array<
    keyof typeof coverageThresholds
  >;
  const failures = metrics.filter(
    (metric) => summary[metric].pct < coverageThresholds[metric],
  );

  if (failures.length === 0) {
    return;
  }

  throw new Error(
    failures
      .map(
        (metric) =>
          `${metric}: ${summary[metric].pct}% is below ${coverageThresholds[metric]}%`,
      )
      .join('\n'),
  );
};

export const mergeCoverage = async (): Promise<void> => {
  const coverageMap = coverageLib.createCoverageMap(
    await readCoverage(vitestCoveragePath),
  );

  for (const path of await getE2ECoveragePaths()) {
    coverageMap.merge(await readCoverage(path));
  }

  normalizeFunctionCoverage(coverageMap);

  const context = reportLib.createContext({
    coverageMap,
    dir: coverageDirectory,
  });

  reports.create('json').execute(context);
  reports.create('html').execute(context);
  reports.create('text-summary').execute(context);
  checkCoverageThresholds(coverageMap);
};

await mergeCoverage();

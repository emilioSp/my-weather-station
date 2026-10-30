// Save browser coverage for merging after end-to-end tests.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import coverageLib from 'istanbul-lib-coverage';
import v8ToIstanbul from 'v8-to-istanbul';

const applicationBasePath = '/my-weather-station/';

type JavaScriptCoverage = Awaited<ReturnType<Page['coverage']['stopJSCoverage']>>;

// Playwright reports every Chromium script. Keep only application modules.
const isApplicationScript = (url: string): boolean => {
  const pathname = new URL(url).pathname;

  return (
    pathname.startsWith(applicationBasePath) &&
    /\.[cm]?[jt]sx?$/.test(pathname) &&
    !pathname.includes('/@fs/') &&
    !pathname.includes('/node_modules/')
  );
};

const getScriptPath = (url: string): string => {
  const pathname = new URL(url).pathname;

  return resolve(process.cwd(), pathname.slice(applicationBasePath.length));
};

type SaveCoverageInput = {
  jsCoverage: JavaScriptCoverage;
  name: string;
};

export const saveCoverage = async ({ jsCoverage, name }: SaveCoverageInput): Promise<void> => {
  const coverageMap = coverageLib.createCoverageMap({});

  for (const entry of jsCoverage) {
    if (!isApplicationScript(entry.url) || entry.source === undefined) {
      continue;
    }

    const converter = v8ToIstanbul(getScriptPath(entry.url), 0, {
      source: entry.source,
    });

    await converter.load();
    converter.applyCoverage(entry.functions);
    coverageMap.merge(converter.toIstanbul());
  }

  const outputDirectory = join(process.cwd(), 'coverage', 'playwright');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, `${name}.json`), JSON.stringify(coverageMap.toJSON()));
};

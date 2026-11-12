/*
 * Provide browser specs with automatic coverage and an optional, self-cleaning real database fixture.
 * Import test from this module instead of @playwright/test.
 * The page fixture runs setup before await use(page), which runs the test,
 * then saves coverage afterward using the unique test ID.
 * WebKit runs the same assertions without coverage because Playwright only
 * supports JavaScript coverage on Chromium.
 */
import { test as base } from '@playwright/test';
import { z } from 'zod';

import { MeasurementStore } from '#tests/utils/measurement-store.ts';
import { saveCoverage } from '#tests/utils/save-coverage.ts';

export const test = base.extend<{ measurementStore: MeasurementStore }>({
  // Playwright requires destructuring even when a fixture has no fixture dependencies.
  // eslint-disable-next-line no-empty-pattern
  measurementStore: async ({}, use, testInfo) => {
    const deviceName = z.string().min(1).parse(testInfo.project.metadata.deviceName);
    const measurementStore = new MeasurementStore(deviceName);
    await measurementStore.connect();

    try {
      await use(measurementStore);
    } finally {
      await measurementStore.deleteInsertedRowsAndClose();
    }
  },
  page: async ({ page, browserName }, use, testInfo) => {
    if (browserName !== 'chromium') {
      await use(page);

      return;
    }

    await page.coverage.startJSCoverage();
    await use(page);
    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: testInfo.testId,
    });
  },
});

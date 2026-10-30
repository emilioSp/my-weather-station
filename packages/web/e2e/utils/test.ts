/*
 * Provide Playwright's test with automatic coverage for browser specs.
 * Import test from this module instead of @playwright/test.
 * The page fixture runs setup before await use(page), which runs the test,
 * then saves coverage afterward using the unique test ID.
 * WebKit runs the same assertions without coverage because Playwright only
 * supports JavaScript coverage on Chromium.
 */
import { test as base } from '@playwright/test';

import { saveCoverage } from '#e2e/utils/save-coverage.ts';

export const test = base.extend({
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

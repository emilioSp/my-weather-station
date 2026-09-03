import { expect, type Page, test } from '@playwright/test';

type PngHeader = {
  contentType: string | null;
  height: number;
  ok: boolean;
  width: number;
};

type PngColorCounts = {
  dark: number;
  lime: number;
};

const getPngHeader = async (page: Page, href: string): Promise<PngHeader> =>
  page.evaluate(async (url) => {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(bytes.buffer);

    return {
      contentType: response.headers.get('content-type'),
      height: view.getUint32(20),
      ok: response.ok,
      width: view.getUint32(16),
    };
  }, href);

const getPngColorCounts = async (
  page: Page,
  href: string,
): Promise<PngColorCounts> =>
  page.evaluate(async (url) => {
    const response = await fetch(url);
    const image = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('A 2D canvas context is required to inspect the icon.');
    }

    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let dark = 0;
    let lime = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index] === 16 &&
        pixels[index + 1] === 25 &&
        pixels[index + 2] === 27
      ) {
        dark += 1;
      }

      if (
        pixels[index] === 185 &&
        pixels[index + 1] === 229 &&
        pixels[index + 2] === 59
      ) {
        lime += 1;
      }
    }

    return { dark, lime };
  }, href);

const getLinkHref = async (page: Page, selector: string): Promise<string> => {
  const href = await page.locator(selector).getAttribute('href');
  expect(href).not.toBeNull();

  return new URL(href as string, page.url()).href;
};

test('serves the declared thermometer SVG favicon', async ({ page }) => {
  await page.goto('/');

  const favicon = page.locator('head link[rel="icon"]');
  await expect(favicon).toHaveCount(1);
  await expect(favicon).toHaveAttribute('type', 'image/svg+xml');

  const response = await page.request.get(
    await getLinkHref(page, 'head link[rel="icon"]'),
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  await expect(response.text()).resolves.toContain(
    'M160 64c-26.5 0-48 21.5-48 48',
  );
  await expect(response.text()).resolves.toContain('fill="#b9e53b"');
  await expect(response.text()).resolves.toContain('fill="#10191b"');
});

test('serves the declared 180 by 180 Apple touch icon', async ({ page }) => {
  await page.goto('/');

  const appleTouchIcon = page.locator('head link[rel="apple-touch-icon"]');
  await expect(appleTouchIcon).toHaveCount(1);
  await expect(appleTouchIcon).toHaveAttribute('sizes', '180x180');

  const appleTouchIconHref = await getLinkHref(
    page,
    'head link[rel="apple-touch-icon"]',
  );
  await expect(getPngHeader(page, appleTouchIconHref)).resolves.toEqual({
    contentType: 'image/png',
    height: 180,
    ok: true,
    width: 180,
  });
  const appleTouchIconColors = await getPngColorCounts(
    page,
    appleTouchIconHref,
  );
  expect(appleTouchIconColors.dark).toBeGreaterThan(0);
  expect(appleTouchIconColors.lime).toBeGreaterThan(0);
});

test('serves the declared Android Home Screen icons from the manifest', async ({
  page,
}) => {
  await page.goto('/');

  const manifest = page.locator('head link[rel="manifest"]');
  await expect(manifest).toHaveCount(1);
  const manifestHref = await getLinkHref(page, 'head link[rel="manifest"]');
  const manifestResponse = await page.request.get(manifestHref);
  expect(manifestResponse.ok()).toBe(true);

  const siteManifest = await manifestResponse.json();
  expect(siteManifest.name).toBe('Weather station');
  expect(siteManifest.short_name).toBe('Weather station');
  expect(siteManifest.icons).toEqual([
    {
      src: 'android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ]);

  for (const icon of siteManifest.icons) {
    const size = Number.parseInt(icon.sizes, 10);
    const iconHref = new URL(icon.src, manifestHref).href;
    await expect(getPngHeader(page, iconHref)).resolves.toEqual({
      contentType: 'image/png',
      height: size,
      ok: true,
      width: size,
    });
    const iconColors = await getPngColorCounts(page, iconHref);
    expect(iconColors.dark).toBeGreaterThan(0);
    expect(iconColors.lime).toBeGreaterThan(0);
  }
});

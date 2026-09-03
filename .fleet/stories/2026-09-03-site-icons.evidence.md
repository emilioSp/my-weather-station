# Builder evidence: 2026-09-03-site-icons

## AC1

Removed the favicon link from `apps/web/index.html`.

Red command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✘ serves the declared thermometer SVG favicon
Error: expect(locator).toHaveCount(expected) failed
Expected: 1
Received: 0
1 failed, 2 passed (7.1s)
npm error Lifecycle script `test` failed with error
```

Restored the favicon link.

Green command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✓ serves the declared thermometer SVG favicon
✓ serves the declared 180 by 180 Apple touch icon
✓ serves the declared Android Home Screen icons from the manifest
3 passed (1.7s)
```

## AC2

Changed the Apple touch icon `sizes` attribute to `120x120`.

Red command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✘ serves the declared 180 by 180 Apple touch icon
Error: expect(locator).toHaveAttribute(expected) failed
Expected: "180x180"
Received: "120x120"
1 failed, 2 passed (7.0s)
npm error Lifecycle script `test` failed with error
```

Restored the `180x180` attribute.

Green command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✓ serves the declared thermometer SVG favicon
✓ serves the declared 180 by 180 Apple touch icon
✓ serves the declared Android Home Screen icons from the manifest
3 passed (1.5s)
```

The probe decodes the delivered PNG with Chromium and requires nonzero exact `#10191b` and `#b9e53b` pixel counts.

## AC3

Removed the 512 by 512 icon entry from `apps/web/public/site.webmanifest`.

Red command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✘ serves the declared Android Home Screen icons from the manifest
Error: expect(received).toEqual(expected) // deep equality
Expected: manifest icons for 192x192 and 512x512
Received: manifest icon for 192x192 only
1 failed, 2 passed (1.8s)
npm error Lifecycle script `test` failed with error
```

Restored the 512 by 512 manifest entry.

Green command:

```text
$ npm run test -w @wx/web -- e2e/site-icons.spec.ts
Running 3 tests using 1 worker
✓ serves the declared thermometer SVG favicon
✓ serves the declared 180 by 180 Apple touch icon
✓ serves the declared Android Home Screen icons from the manifest
3 passed (1.5s)
```

The probe decodes each delivered Android PNG with Chromium and requires nonzero exact `#10191b` and `#b9e53b` pixel counts.

## Required checks

```text
$ npm run lint
Checked 69 files in 31ms. Fixed 1 file.

$ npm run build
@wx/collector build: tsc
@wx/web build: tsc && vite build --mode prod
@wx/shared build: tsc
✓ built in 1.02s

$ npm test
Running 6 tests using 2 workers
✓ 6 passed (4.6s)
```

# 2026-09-03-site-icons: Weather station browser icons

## Problem

The web app has no browser icon. Add a favicon, an Apple touch icon, and Android Home Screen icons based on the thermometer logo already displayed in the Weather station header, so users can identify the site in browser tabs and when they save it to a mobile device Home Screen.

## Constraints

- Do not add or change dependencies.
- Use the existing `FaTemperatureHalf` header logo as the icon source. Do not introduce a different symbol.
- Keep the existing header logo unchanged.
- The favicon must be an SVG resource.
- The Apple touch icon must be a 180 by 180 PNG resource.
- Android Home Screen icons must be 192 by 192 and 512 by 512 PNG resources, declared in a web app manifest.
- Use the existing Playwright and Chromium setup for browser verification.

## Allowed paths

- `apps/web/index.html`
- `apps/web/public/favicon.svg`
- `apps/web/public/apple-touch-icon.png`
- `apps/web/public/android-chrome-192x192.png`
- `apps/web/public/android-chrome-512x512.png`
- `apps/web/public/site.webmanifest`
- `apps/web/e2e/site-icons.spec.ts`
- `.fleet/**`

## Technical details

- Put the icon resources and `site.webmanifest` in `apps/web/public/` so Vite publishes them at the application base path.
- Declare the SVG favicon with a `link` element whose `rel` is `icon`, `type` is `image/svg+xml`, and `href` is `favicon.svg`.
- Declare the PNG with a `link` element whose `rel` is `apple-touch-icon`, `sizes` is `180x180`, and `href` is `apple-touch-icon.png`.
- Declare `site.webmanifest` with a `link` element whose `rel` is `manifest`.
- In `site.webmanifest`, set `name` and `short_name` to `Weather station`, then declare `android-chrome-192x192.png` and `android-chrome-512x512.png` as PNG icons with their matching sizes and `image/png` type.
- Reproduce the thermometer glyph shown by `FaTemperatureHalf` in every icon resource. Use the header colours: lime `#b9e53b` thermometer on dark `#10191b` background.

## Acceptance criteria

### AC1: A browser receives the thermometer favicon declared by the web app

- probe: `npm run test -w @wx/web -- e2e/site-icons.spec.ts`
- postcondition: Chromium loads the web app and finds one `link[rel="icon"]` in the document head with `type="image/svg+xml"` and an `href` that resolves to a successful SVG response. The response contains the `FaTemperatureHalf` thermometer glyph, with a lime `#b9e53b` foreground on a dark `#10191b` background.
- red_when: Remove the favicon `link` element from `apps/web/index.html` and rerun the probe.

### AC2: A browser receives the declared 180 by 180 Apple touch icon

- probe: `npm run test -w @wx/web -- e2e/site-icons.spec.ts`
- postcondition: Chromium loads the web app and finds one `link[rel="apple-touch-icon"]` with `sizes="180x180"` whose `href` resolves to a successful PNG response. The PNG header reports a width and height of 180 pixels.
- red_when: Change the Apple touch icon `sizes` attribute to `120x120` and rerun the probe.

### AC3: A browser receives the declared Android Home Screen icons

- probe: `npm run test -w @wx/web -- e2e/site-icons.spec.ts`
- postcondition: Chromium loads the web app and finds one manifest link whose successful JSON response has `name` and `short_name` set to `Weather station`. It declares `android-chrome-192x192.png` and `android-chrome-512x512.png` with matching `192x192` and `512x512` sizes and `image/png` type. Both href values resolve to successful PNG responses whose headers report the declared dimensions.
- red_when: Remove the 512 by 512 icon entry from `apps/web/public/site.webmanifest` and rerun the probe.

## Out of scope

- Changes to the page header, page layout, application behaviour, or branding beyond the browser icon resources.
- Android application behaviour, offline support, service workers, install prompts, pinned-tab icons, or other progressive web app support.


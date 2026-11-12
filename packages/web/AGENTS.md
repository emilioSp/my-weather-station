# Web app

## Architecture

```text
main.tsx
  -> view
     -> API module
        -> external service
```

- Keep external service access in dedicated API modules.
- An API module returns application domain data.
- Keep application configuration in a dedicated module.
- Validate configuration at startup when it comes from external input.

## React components

- Use functional components and hooks.
- Put each component in a file named after the component.
- Export components with `export const Component = () => {}`.
- Define a `<ComponentName>Props` type above a component when it has props.
- Access built-in hooks through the `React` namespace, such as `React.useState()`.
- Use `useMemo` and `useCallback` only when React Compiler does not optimize the case and the benefit exceeds the maintenance cost.
- Do not use nested ternaries in JSX. Use guard clauses or single-level conditions.

## Tests

- Import Playwright's coverage-enabled `test` from `#tests/utils/test.ts`.
- Do not use XPath locators. Use `data-testid` attributes instead.
- Assert user-visible results, not loading indicators alone.
- Do not use fixed waits. Wait for an expected UI value or state.
- Keep scenario data in `tests/fixtures/` and browser test support in `tests/utils/`.

### Visual

- Live in `tests/visual/`, with reference screenshots beside the spec.
- Compare screenshots to verify appearance and layout across viewports and browsers.
- Use fixed, mocked HTTP responses to keep screenshots stable. These are not full-stack E2E tests.
- Run with `npm run test:visual -w @wx/web` in the Linux Docker environment. Update snapshots only after intentional UI changes and review the image diffs.
- Do not duplicate layout checks in UI or E2E tests when visual snapshots already cover them.

### UI

- Live in `tests/ui/` and exercise the application in a real browser with mocked HTTP responses.
- Use mocks when the scenario needs controlled failures, pending requests, or response timing. These tests verify UI behavior, not the Supabase integration.
- Use real E2E tests for normal data loading, refresh, and interactions that do not need HTTP mocks.
- Run in the `mocked-http-chromium` and `mocked-http-webkit` projects against the Vite server on port `4173`, which also serves visual tests.

### E2E

- Live in `tests/e2e/` and exercise the full browser → local Supabase HTTP API → PostgreSQL flow. Do not mock HTTP responses, the API module, or the database.
- Require local Supabase to be running with the collector migrations applied.
- Run in the `chromium` and `webkit` projects sequentially against a separate Vite server on port `4174`, configured with a unique device name per run.
- Seed committed measurements with unique IDs and recent timestamps. Insert newer measurements before testing refresh behavior.
- Use fixture teardown with `try/finally` to delete only the inserted IDs, including on failures. Never truncate tables or assume the local database is empty.
- Do not use transaction rollback for isolation: Supabase reads through separate connections and cannot see uncommitted test data.
- Browser clock control is allowed, but it does not change PostgreSQL's clock. Keep measurement timestamps inside the requested range and out of the database's future.
- `npm run test:e2e -w @wx/web` currently runs both UI and E2E tests, excluding visual tests. Select `--project=chromium --project=webkit` to run only real E2E tests.

## Styling and responsive layout

- Use Tailwind utility classes.
- Put small, reusable UI components in `components/primitives/`. Do not use `@apply`.
- Avoid inline `style` properties unless values are dynamic.
- Do not use CSS-in-JS.
- Prefer CSS Grid over CSS Flex.
- Use these target resolutions:
  - Desktop: 1280 × 700
  - Tablet: 1024 × 714
  - Smartphone: 390 × 844
- As the viewport becomes smaller, elements may only stack or hide. Keep the same DOM structure for all resolutions and users.
- Use `react-icons` for icons.

## Folder structure rules

### `views`

Contains page components.

A view defines page layout and page flow.  
A view uses components and hooks.  
Keep a view small and easy to read.

### `components/<feature>`

Contains components for one feature.

A feature component shows one page section or completes one feature task.  
It can use application data and feature terms.

### `components/primitives`

Contains small general UI components.

A primitive must not use feature terms, application data, or business rules.  
Examples are `Accordion`, `IconButton`, and `ProgressBar`.

### `hooks`

Contains hooks.

A hook manages related state, data loading, and user actions.  
Use a hook when it makes a view or component easier to read.

### `utils`

Folder used to store utility modules.

```text
main.tsx
index.html
components/
  primitives/
    Accordion.tsx
    IconButton.tsx
    ProgressBar.tsx
  <feature>/
    FeatureCard.tsx
    FeatureChart.tsx
hooks/
  useFeature.ts
views/
  FeatureView.tsx
utils/
  convertSomethingIntoSomethingElse.util.ts
```

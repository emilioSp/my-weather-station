# Web app

## Architecture

This workspace has no server. The browser reads measurements from Supabase.

```text
main.tsx
  -> App.tsx
     -> supabase.api.ts
        -> @supabase/supabase-js -> PostgREST -> PostgreSQL
```

- `supabase.api.ts` is the only Supabase boundary. It returns rows converted to domain case.
- `environment.ts` validates `VITE_` variables with Zod at startup.

## React components

- Use functional components and hooks.
- Put each component in a file named after the component.
- Export components with `export const Component = () => {}`.
- Define a `<ComponentName>Props` type above a component when it has props.
- Access built-in hooks through the `React` namespace, such as `React.useState()`.
- Use `useMemo` and `useCallback` only when React Compiler does not optimize the case and the benefit exceeds the maintenance cost.
- Create custom hooks only when reuse or performance justifies them.
- Do not split a manageable view into subcomponents unless they are reused.
- Do not use nested ternaries in JSX. Use guard clauses or single-level conditions.

## Styling and responsive layout

- Use Tailwind utility classes.
- Put frequently reused styles in reusable components in `ui/`. Do not use `@apply`.
- Avoid inline `style` properties unless values are dynamic.
- Do not use CSS-in-JS.
- Prefer CSS Grid over CSS Flex.
- Use these target resolutions:
  - Desktop: 1280 × 700
  - Tablet: 768 × 1024
  - Smartphone: 390 × 844
- As the viewport becomes smaller, elements may only stack or hide. Keep the same DOM structure for all resolutions and users.
- Use `react-icons` for icons.

## Suggested structure

```text
main.tsx
index.html
components/
  WeatherCard.tsx
  WeatherCardItem.tsx
  LinearChart.tsx
hooks/
  useMe.ts
ui/
  icons.tsx
  Button.tsx
  ProgressBar.tsx
views/
  Layout.tsx
  Header.tsx
  Footer.tsx
  WeatherStation.tsx
```

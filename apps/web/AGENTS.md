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

## Styling and responsive layout

- Use Tailwind utility classes.
- Put small, reusable UI components in `components/primitives/`. Do not use `@apply`.
- Avoid inline `style` properties unless values are dynamic.
- Do not use CSS-in-JS.
- Prefer CSS Grid over CSS Flex.
- Use these target resolutions:
  - Desktop: 1280 × 700
  - Tablet: 768 × 1024
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
```

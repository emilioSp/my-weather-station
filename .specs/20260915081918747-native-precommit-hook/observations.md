# Builder observations

## AC1

Breakage applied:

```sh
git config --unset core.hooksPath
test "$(git config --get core.hooksPath)" = .githooks && test -x .githooks/pre-commit
```

Output:

```text
unset=0 red_probe=1
```

The probe produced no stdout and exited 1. Restored with `git config core.hooksPath .githooks`.

```sh
test "$(git config --get core.hooksPath)" = .githooks && test -x .githooks/pre-commit
```

Output:

```text
green_probe=0
```

The restored probe produced no stdout and exited 0.

## AC2

The documented command was temporarily removed from `README.md`.

```sh
rg -F 'git config core.hooksPath .githooks' README.md
```

Output:

```text
red_probe=1
```

The probe produced no stdout and exited 1. The command was restored.

```sh
rg -F 'git config core.hooksPath .githooks' README.md
```

Output:

```text
git config core.hooksPath .githooks
green_probe=0
```

## Required workflow commands

```sh
npm run lint
```

Output:

```text
Checked 68 files in 9ms. No fixes applied.
```

```sh
npm run build
```

Output:

```text
@wx/collector: tsc completed
@wx/web: tsc && vite build --mode prod completed
@wx/shared: tsc completed
```

```sh
npm test
```

Output:

```text
6 passed (5.0s)
```

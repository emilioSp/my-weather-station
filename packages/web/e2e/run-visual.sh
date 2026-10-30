#!/usr/bin/env bash
# Run or update visual snapshots in the same Linux browser environment used by CI.
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
playwright_version="$(node -p "require(process.argv[1]).devDependencies['@playwright/test']" "$repository_root/package.json")"

# Keep Linux dependencies in disposable volumes, away from the host's node_modules.
# Pin amd64 so Apple Silicon and CI render with the same browser architecture.
docker run --rm --init --platform linux/amd64 --ipc=host \
  --mount "type=bind,source=$repository_root,target=/work" \
  --mount type=volume,target=/work/node_modules,volume-nocopy \
  --mount type=volume,target=/work/packages/collector/node_modules,volume-nocopy \
  --mount type=volume,target=/work/packages/shared/node_modules,volume-nocopy \
  --mount type=volume,target=/work/packages/web/node_modules,volume-nocopy \
  --workdir /work \
  --env CI \
  "mcr.microsoft.com/playwright:v${playwright_version}-noble" \
  sh -c 'npm ci --ignore-scripts && npm exec -w @wx/web -- playwright test --grep @visual "$@"' sh "$@"

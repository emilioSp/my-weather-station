#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <spec-id>" >&2
  exit 1
fi

id=$1
target=".workflow/handoffs/$id.verifier.json"

sed "s/<id>/$id/g" .workflow/templates/verifier.json > "$target"
echo "Wrote $target"

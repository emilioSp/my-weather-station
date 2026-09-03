#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
target=".fleet/handoffs/$id.build.json"

sed "s/<id>/$id/g" .fleet/templates/build.json > "$target"
echo "Wrote $target"

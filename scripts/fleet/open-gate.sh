#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
target=".fleet/handoffs/$id.gate.json"

if [ -e "$target" ]; then
  echo "Gate already exists: $target" >&2
  exit 1
fi

sed "s/<id>/$id/g" .fleet/templates/gate.json > "$target"
echo "Created $target"

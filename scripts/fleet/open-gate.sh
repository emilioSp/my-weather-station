#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
n=1
while [ -e ".fleet/handoffs/$id.gate.$n.json" ]; do
  n=$((n + 1))
done

target=".fleet/handoffs/$id.gate.$n.json"
sed "s/<id>/$id/g" .fleet/templates/gate.json > "$target"
echo "Wrote $target"

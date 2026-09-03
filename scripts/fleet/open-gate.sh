#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <story-id> <worker|reviewer>" >&2
  exit 1
fi

id=$1
role=$2

case "$role" in
  worker|reviewer) ;;
  *)
    echo "Role must be worker or reviewer: $role" >&2
    exit 1
    ;;
esac

n=1
while [ -e ".fleet/handoffs/$id.gate.$role.$n.json" ]; do
  n=$((n + 1))
done

target=".fleet/handoffs/$id.gate.$role.$n.json"
sed "s/<id>/$id/g" .fleet/templates/gate.json > "$target"
echo "Wrote $target"

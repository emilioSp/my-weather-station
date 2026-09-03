#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <spec-id>" >&2
  exit 1
fi

id=$1
n=1
while [ -e ".workflow/handoffs/$id.escalation.$n.json" ]; do
  n=$((n + 1))
done

target=".workflow/handoffs/$id.escalation.$n.json"
sed "s/<id>/$id/g" .workflow/templates/escalation.json > "$target"
echo "Wrote $target"

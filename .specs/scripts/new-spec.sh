#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <spec-slug>" >&2
  exit 1
fi

id="$(date +%F)-$1"
target=".specs/specs/$id.md"

if [ -e "$target" ]; then
  echo "Spec already exists: $target" >&2
  exit 1
fi

sed "s/<id>/$id/g" .specs/templates/spec.md > "$target"
echo "Created $target"

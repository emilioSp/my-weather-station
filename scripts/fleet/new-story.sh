#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
target=".fleet/stories/$id.md"

if [ -e "$target" ]; then
  echo "Story already exists: $target" >&2
  exit 1
fi

sed "s/<id>/$id/g" .fleet/templates/story.md > "$target"
echo "Created $target"

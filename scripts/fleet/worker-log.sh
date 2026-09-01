#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
root=$(git rev-parse --show-toplevel)
log_file="$root/.fleet/handoffs/$id.worker.log"

if [ ! -f "$log_file" ]; then
  echo "Worker log not found: $log_file" >&2
  exit 1
fi

tail -f "$log_file"

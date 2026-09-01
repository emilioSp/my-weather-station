#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1
root=$(git rev-parse --show-toplevel)
run_file="$root/.fleet/handoffs/$id.worker-run.json"
exit_file="$root/.fleet/handoffs/$id.worker-exit.json"

if [ ! -f "$run_file" ]; then
  echo "Worker run not found: $run_file" >&2
  exit 1
fi

FLEET_RUN_FILE=$run_file FLEET_EXIT_FILE=$exit_file node --input-type=module -e '
import { readFile } from "node:fs/promises";

const run = JSON.parse(await readFile(process.env.FLEET_RUN_FILE, "utf8"));
let state = "stopped without an exit record";
let exitCode;

try {
  const result = JSON.parse(await readFile(process.env.FLEET_EXIT_FILE, "utf8"));
  state = result.status;
  exitCode = result.exit_code;
} catch {
  try {
    process.kill(run.pid, 0);
    state = "running";
  } catch {
    state = "stopped without an exit record";
  }
}

console.log(`Story: ${run.id}`);
console.log(`Status: ${state}`);
console.log(`PID: ${run.pid}`);
console.log(`Branch: ${run.branch}`);
console.log(`Worktree: ${run.worktree}`);
console.log(`Started: ${run.started_at}`);
if (exitCode !== undefined) console.log(`Exit code: ${exitCode}`);
console.log(`Log: ${run.log}`);
'

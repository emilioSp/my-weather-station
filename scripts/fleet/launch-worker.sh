#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <story-id>" >&2
  exit 1
fi

id=$1

case "$id" in
  *[!A-Za-z0-9_-]* | '')
    echo "Story id must use only letters, numbers, underscores, and hyphens." >&2
    exit 1
    ;;
esac

root=$(git rev-parse --show-toplevel)
story="$root/.fleet/stories/$id.md"
run_file="$root/.fleet/handoffs/$id.worker-run.json"
exit_file="$root/.fleet/handoffs/$id.worker-exit.json"
log_file="$root/.fleet/handoffs/$id.worker.log"
prompt_file="$root/.fleet/handoffs/$id.worker-prompt.md"
worktree="$root/.worktree/$id"
branch="fleet/$id"

if [ ! -f "$story" ]; then
  echo "Story not found: $story" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Cannot launch worker: the base working tree is not clean." >&2
  echo "Commit the intended story and workflow files, or remove unwanted changes." >&2
  echo "Read CONTRIBUTING.md, The normal path, step 3." >&2
  exit 1
fi

if [ -e "$run_file" ]; then
  echo "Worker run already exists: $run_file" >&2
  exit 1
fi

if [ -e "$worktree" ]; then
  echo "Worktree path already exists: $worktree" >&2
  exit 1
fi

git worktree add -b "$branch" "$worktree" HEAD

printf '%s\n' \
  "You are the worker for story $id." \
  "Read AGENTS.md and AGENTS_WORKFLOW_CONTRIBUTING.md first." \
  "Then read .fleet/stories/$id.md at the start of every pass." \
  "Implement only the listed paths and follow every constraint." \
  "Do not guess. Open a gate when blocked." \
  "Write builder evidence and the worker report required by the workflow." \
  > "$prompt_file"

started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

FLEET_ID=$id \
FLEET_BRANCH=$branch \
FLEET_WORKTREE=$worktree \
FLEET_LOG=$log_file \
FLEET_STARTED_AT=$started_at \
node --input-type=module -e '
const report = {
  id: process.env.FLEET_ID,
  role: "worker",
  status: "running",
  pid: null,
  branch: process.env.FLEET_BRANCH,
  worktree: process.env.FLEET_WORKTREE,
  log: process.env.FLEET_LOG,
  started_at: process.env.FLEET_STARTED_AT
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
' > "$run_file"

pid=$$

FLEET_RUN_FILE=$run_file FLEET_PID=$pid node --input-type=module -e '
import { readFile, writeFile } from "node:fs/promises";

const runFile = process.env.FLEET_RUN_FILE;
const report = JSON.parse(await readFile(runFile, "utf8"));
report.pid = Number(process.env.FLEET_PID);
await writeFile(runFile, JSON.stringify(report, null, 2) + "\n");
'

echo "Worker started"
echo "Story: $id"
echo "PID: $pid"
echo "Worktree: $worktree"
echo "Status: scripts/fleet/worker-status.sh $id"
echo "Log: scripts/fleet/worker-log.sh $id"

write_exit_record() {
  exit_code=$?

  FLEET_EXIT_CODE=$exit_code FLEET_FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    node --input-type=module -e '
      process.stdout.write(JSON.stringify({
        status: "finished",
        exit_code: Number(process.env.FLEET_EXIT_CODE),
        finished_at: process.env.FLEET_FINISHED_AT
      }, null, 2) + "\n");
    ' > "$exit_file"
}

trap write_exit_record 0

cd "$worktree"
codex exec --model gpt-5.6-terra --json --sandbox workspace-write - < "$prompt_file" > "$log_file" 2>&1

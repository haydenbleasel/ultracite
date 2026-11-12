#!/bin/sh
# Runs prompt-revision specs one after another (the harness locks shared folders while an agent
# runs, so runs can't overlap). Each argument is <base-topic>/<subject>:<agent>:<n>, or
# round-2/<base-topic>/<subject>:<agent>:<n> for round two.
cd "$(dirname "$0")/../.." || exit 1
for spec in "$@"; do
  topic="${spec%/*}"
  RESEARCH_TOPIC="prompt-revision/$topic" node scripts/run-batch.mjs "${spec##*/}"
done
echo "=== all done $(date -u +%FT%TZ)"

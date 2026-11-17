#!/usr/bin/env bash
# Designs Kane Assurance tests for a list of use-cases, one at a time (the context store is single-writer).
# Usage: bash m0-lab/design-batch.sh uc-2 uc-3 ...
# Raw streams go to m0-lab/results/assurance/ (untracked).
set -u
out="m0-lab/results/assurance"
mkdir -p "$out"
for uc in "$@"; do
  echo "[$(date -u +%H:%M:%S)] designing $uc"
  KANE_CLI_USER_AGENT=claude-code kane-cli design tests --use-case "$uc" --mode agent --max 6 \
    > "$out/design-$uc.ndjson" 2> "$out/design-$uc.stderr.txt"
  code=$?
  echo "exit=$code" > "$out/design-$uc.exit.txt"
  echo "[$(date -u +%H:%M:%S)] $uc exit=$code"
done
echo "design batch complete"

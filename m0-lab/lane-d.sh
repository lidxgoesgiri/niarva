#!/usr/bin/env bash
# Sequential M0 follow-ups: boundary failure detection, timeout semantics, responsive capability.
# One Kane run at a time (M0 showed infrastructure failures under parallel execution).
set -u
cd "$(dirname "$0")/.."
log="m0-lab/results/batch-d.log"
run() { # runId objective vars timeout
  local line
  line=$(node m0-lab/run.mjs "$1" "objectives/$2.txt" "vars/$3.json" "$4" 2>/dev/null | grep '^{' | tail -1)
  [ -n "$line" ] || line="{\"runId\":\"$1\",\"error\":\"no summary\"}"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $2 $3 $line" >> "$log"
  echo "$1 done"
}

run FAIL-boundary-gt-2 O-BOUNDARY lab-gt 240

# Give the CLI's own --timeout room to act before the lab watchdog steps in.
M0_WATCHDOG_EXTRA=150 run K04-timeout-30 O-SLOW lab-local 30

kane-cli config set-window 390x844 > m0-lab/results/K09-set-window.txt 2>&1
run K09-viewport-390 O-VIEWPORT lab-local 180
kane-cli config set-window 1920x1080 >> m0-lab/results/K09-set-window.txt 2>&1
run K09-viewport-1920 O-VIEWPORT lab-local 180
echo "lane d complete"

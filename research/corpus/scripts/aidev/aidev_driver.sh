#!/bin/bash
# Resume the AIDev pulls until each finishes, then classify and fetch PR labels. Logs to aidev/driver.log.
cd "$(dirname "$0")/.."
run_until_done () { # tag like regex logfile
  while true; do
    PREV_TOTAL=4770 python3 -I scripts/aidev_pull.py "$1" "$2" "$3" 2>> "$4"
    if tail -1 "$4" | grep -q '^done'; then echo "$(date -u +%FT%TZ) $1 done" >> aidev/driver.log; break; fi
    echo "$(date -u +%FT%TZ) $1 not done, sleeping 300s" >> aidev/driver.log; sleep 60
  done
}
run_until_done exhaustive-deps '%exhaustive-deps%' 'exhaustive-deps' aidev/exhaustive-deps.log
run_until_done biome-ued '%useExhaustiveDependencies%' 'useExhaustiveDependencies' aidev/biome-ued.log
python3 -I scripts/aidev_classify.py exhaustive-deps > aidev/classify-exhaustive-deps.json
python3 -I scripts/aidev_classify.py biome-ued > aidev/classify-biome-ued.json
python3 -I -c "import json; a=set(json.load(open('aidev/exhaustive-deps-prids.json'))); b=set(json.load(open('aidev/biome-ued-prids.json'))); json.dump(sorted(a|b), open('aidev/all-prids.json','w')); print(len(a|b))" >> aidev/driver.log
while true; do
  python3 -I scripts/aidev_prs.py all-prids.json 2>> aidev/prs.log
  if tail -1 aidev/prs.log | grep -q '^done'; then echo "$(date -u +%FT%TZ) prs done" >> aidev/driver.log; break; fi
  echo "$(date -u +%FT%TZ) prs not done, sleeping 300s" >> aidev/driver.log; sleep 60
done
python3 -I scripts/aidev_agent_counts.py 2>> aidev/driver.log
python3 -I scripts/aidev_classify2.py > aidev/classify2-full.json
python3 -I scripts/aidev_summary.py eslint,oxlint > aidev/summary-eslint-oxlint.json
echo "$(date -u +%FT%TZ) ALL DONE" >> aidev/driver.log

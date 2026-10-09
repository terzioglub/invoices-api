#!/usr/bin/env bash
set -uo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
repo=terzioglub/invoices-api
queue=()
for t in 1 2 3; do
  for s in search overdue unique-email finish-cents; do
    for a in exp-a exp-b exp-c; do queue+=("$s $t $a"); done
  done
done

busy() {
  local n
  n=$(gh run list -R "$repo" --workflow epho-code-review.yml -L 50 --json status \
        --jq '[.[] | select(.status != "completed")] | length' 2>/dev/null || echo 1)
  [ "$n" != "0" ]
}

i=0
for item in "${queue[@]}"; do
  read -r s t a <<<"$item"
  "$dir/open-pr.sh" "$s" "$t" "$a" || echo "FAILED to open $s t$t $a"
  i=$((i + 1))
  if [ $((i % 6)) -eq 0 ] || [ "$i" -eq "${#queue[@]}" ]; then
    echo "batch done at $i, waiting for reviews ($(date +%H:%M:%S))"
    sleep 30
    while busy; do sleep 20; done
    echo "reviews finished ($(date +%H:%M:%S))"
  fi
done
echo "ALL DONE"

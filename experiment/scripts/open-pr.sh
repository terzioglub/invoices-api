#!/usr/bin/env bash
set -uo pipefail
scenario="$1" trial="$2" arm="$3"
dir="$(cd "$(dirname "$0")" && pwd)"
repo=terzioglub/invoices-api
head="exp/$scenario-t$trial"
title=$(jq -r --arg s "$scenario" '.[$s].title' "$dir/scenarios.json")
body=$(jq -r --arg s "$scenario" '.[$s].body' "$dir/scenarios.json")
url=""
for attempt in 1 2 3; do
  url=$(gh pr create -R "$repo" --base "$arm" --head "$head" --title "$title" --body "$body" 2>/dev/null) && break
  sleep 5
  url=$(gh pr list -R "$repo" --state open --head "$head" --base "$arm" --json url --jq '.[0].url // empty' 2>/dev/null)
  [ -n "$url" ] && break
done
[ -n "$url" ] || { echo "FAILED to open $scenario t$trial $arm" >&2; exit 1; }
echo "$scenario,$trial,$arm,${url##*/},$url" | tee -a "$dir/prs.csv"

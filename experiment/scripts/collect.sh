#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
repo=terzioglub/invoices-api
mkdir -p "$dir/results"
map="$dir/run-map.csv"
touch "$map"

gh run list -R "$repo" --workflow epho-code-review.yml -L 200 --json databaseId,status,conclusion,createdAt,updatedAt \
  --jq '.[] | select(.status == "completed") | "\(.databaseId),\(.conclusion),\(.createdAt),\(.updatedAt)"' |
while IFS=, read -r id conclusion created updated; do
  grep -q "^$id," "$map" && continue
  pr=$(gh run view "$id" -R "$repo" --log 2>/dev/null | grep -m1 -oE 'PR_NUMBER: [0-9]+' | awk '{print $2}' || true)
  echo "$id,${pr:-},$conclusion,$created,$updated" >> "$map"
done

tail -n +2 "$dir/prs.csv" | while IFS=, read -r scenario trial arm number url; do
  run=$(awk -F, -v n="$number" '$2 == n {printf "{\"id\":%s,\"conclusion\":\"%s\",\"created\":\"%s\",\"updated\":\"%s\"}\n", $1, $3, $4, $5}' "$map" | jq -s .)
  jq -n \
    --arg scenario "$scenario" --argjson trial "$trial" --arg arm "$arm" --argjson number "$number" --arg url "$url" \
    --argjson reviews "$(gh api "repos/$repo/pulls/$number/reviews" --jq '[.[] | select(.user.login == "github-actions[bot]") | {state, body, submitted_at}]')" \
    --argjson comments "$(gh api "repos/$repo/pulls/$number/comments" --jq '[.[] | select(.user.login == "github-actions[bot]") | {path, line, body}]')" \
    --argjson issue_comments "$(gh api "repos/$repo/issues/$number/comments" --jq '[.[] | select(.user.login == "github-actions[bot]") | {body}]')" \
    --argjson runs "$run" \
    '{scenario: $scenario, trial: $trial, arm: $arm, number: $number, url: $url, reviews: $reviews, comments: $comments, issue_comments: $issue_comments, runs: $runs}' \
    > "$dir/results/$scenario-t$trial-$arm.json"
  echo "collected #$number $scenario t$trial $arm ($(jq '.comments | length' "$dir/results/$scenario-t$trial-$arm.json") comments)"
done

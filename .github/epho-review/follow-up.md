New commits were pushed. You already reviewed this PR in this conversation.

Sync the clone, then review what changed since your last review:

```sh
cd "$REPO_DIR" && git diff "$BEFORE_SHA" "$HEAD_SHA"
```

Use the whole PR diff for context. If `BEFORE_SHA` isn't set, or this fails (the branch was force-pushed or rebased), review the whole PR diff instead:

```sh
cd "$REPO_DIR" && git merge-base --is-ancestor "$BEFORE_SHA" "$HEAD_SHA"
```

Fetch your earlier review threads. For each unresolved one:

- If the new code fixes it, reply with a check mark and resolve the thread:

  ```sh
  gh api graphql -f thread=<thread_id> -f body="✅ Fixed in ${HEAD_SHA:0:7}" -f query='
    mutation($thread: ID!, $body: String!) {
      addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $thread, body: $body}) { comment { id } }
      resolveReviewThread(input: {threadId: $thread}) { thread { isResolved } } }'
  ```

- If it's still a problem, leave it alone. Don't post it again.

Only resolve your own threads, and only when the code fixes them. Post comments only for problems that are new. If there's nothing new, skip the review; don't post an empty one.

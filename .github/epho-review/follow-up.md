New commits were pushed. You have already reviewed this PR in this conversation.
Sync the clone, then review what changed since your last review:
  cd "$REPO_DIR" && git diff "$BEFORE_SHA" "$HEAD_SHA"
using the whole PR diff for context. If BEFORE_SHA isn't set, or
  cd "$REPO_DIR" && git merge-base --is-ancestor "$BEFORE_SHA" "$HEAD_SHA"
fails (the branch was force-pushed or rebased), review the whole PR diff instead.

Fetch your earlier review threads. For each unresolved one:
  - if the new code fixes it, react to your comment with a thumbs-up:
      gh api graphql -f query='mutation($id: ID!) { addReaction(input: {subjectId: $id, content: THUMBS_UP}) { reaction { content } } }' -f id=<comment_id>
  - if it's still a problem, leave it alone. Don't post it again.
Don't resolve threads or reply to them; that's up to the PR author. Only post
comments for problems that are new. If there's nothing new, skip the review;
don't post an empty one.

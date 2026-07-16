<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Every PR gets a tweet

A merged PR auto-posts to `/community`. Before opening any PR that `shouldAnnounce`
would announce (feat/fix/perf/chore, non-noise scope, no `no-announce` label), write a
`Tweet:` line in the PR body per `docs/PR-TWEET.md`. Read that doc first — the process
is five drafts, ship one. No line means the fallback template pool posts instead.

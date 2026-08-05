import { NextResponse } from "next/server";

import { verifyGithubSignature } from "@/lib/community/auto/github-verify";
import { parsePrTitle, shouldAnnounce, humanizeSubject, projectFor, hashtagFor, withHashtag, extractTweet, extractThread, extractVersion, buildBrief } from "@/lib/community/auto/pr";
import { autoPost } from "@/lib/community/auto/post";
import { writeNote } from "@/lib/community/auto/note-llm";
import { pick } from "@/lib/community/auto/templates";

export const dynamic = "force-dynamic";

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * GitHub `pull_request` webhook, shared by every repo on the allowlist in
 * `pr.ts`. On a merged PR whose title passes the user-facing heuristic (and
 * lacks a `no-announce` label), post a "just shipped" line to /community.
 * HMAC-verified; idempotent per repo + PR number.
 */
export async function POST(request: Request) {
  const raw = await request.text(); // raw body needed for HMAC
  const sig = request.headers.get("x-hub-signature-256");
  if (!SECRET || !verifyGithubSignature(SECRET, raw, sig)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (request.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: "event" });
  }

  let payload: {
    action?: string;
    repository?: { full_name?: string };
    pull_request?: {
      merged?: boolean; number?: number; title?: string; body?: string | null;
      labels?: { name?: string }[];
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const repo = (payload.repository?.full_name ?? "").toLowerCase();
  const project = projectFor(repo);
  if (!project) {
    return NextResponse.json({ ok: true, ignored: "repo" });
  }

  const pr = payload.pull_request;
  if (payload.action !== "closed" || !pr?.merged || !pr.number) {
    return NextResponse.json({ ok: true, ignored: "not-merged" });
  }

  const title = pr.title ?? "";
  const labels = Array.isArray(pr.labels) ? pr.labels.map((l) => String(l?.name ?? "")) : [];
  if (!shouldAnnounce(title, labels, repo)) {
    return NextResponse.json({ ok: true, ignored: "filtered" });
  }

  // Wording precedence, all under the same `shouldAnnounce` gate:
  //   1. an author-written `Tweet:` line — a human chose it, use it verbatim;
  //   2. else Haiku writes it in the founder's voice (two drafts, judged winner);
  //   3. else the template pool — the safety net when the model is off/erroring, so
  //      a PR that should announce always posts *something*.
  const body =
    extractTweet(pr.body) ??
    (await writeNote(buildBrief({ project, title, body: pr.body, labels }))) ??
    pick("pr", { title: humanizeSubject(parsePrTitle(title).subject), project });
  // Key includes the repo: PR #5 exists in every repo, and a bare `pr:5` would
  // make the second repo's PR #5 dedupe against the first and never post.
  await autoPost({
    sourceKey: `pr:${repo}#${pr.number}`,
    body: withHashtag(body, hashtagFor(repo)),
    thread: extractThread(pr.body),
    version: extractVersion(pr.body),
  });
  return NextResponse.json({ ok: true, posted: true });
}

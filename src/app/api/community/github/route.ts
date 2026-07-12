import { NextResponse } from "next/server";

import { verifyGithubSignature } from "@/lib/community/auto/github-verify";
import { parsePrTitle, shouldAnnounce, humanizeSubject } from "@/lib/community/auto/pr";
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";

export const dynamic = "force-dynamic";

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * GitHub `pull_request` webhook. On a merged PR whose title passes the
 * user-facing heuristic (and lacks a `no-announce` label), post a "just shipped"
 * line to /community. HMAC-verified; idempotent per PR number.
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
    pull_request?: { merged?: boolean; number?: number; title?: string; labels?: { name?: string }[] };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pr = payload.pull_request;
  if (payload.action !== "closed" || !pr?.merged || !pr.number) {
    return NextResponse.json({ ok: true, ignored: "not-merged" });
  }

  const title = pr.title ?? "";
  const labels = Array.isArray(pr.labels) ? pr.labels.map((l) => String(l?.name ?? "")) : [];
  if (!shouldAnnounce(title, labels)) {
    return NextResponse.json({ ok: true, ignored: "filtered" });
  }

  const subject = humanizeSubject(parsePrTitle(title).subject);
  await autoPost({ sourceKey: `pr:${pr.number}`, body: pick("pr", { title: subject }) });
  return NextResponse.json({ ok: true, posted: true });
}

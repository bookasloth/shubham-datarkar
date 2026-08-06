import { NextResponse } from "next/server";
import { aiContentBrief } from "@/lib/tools/ai-brief";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Public, unauthenticated LLM endpoint: cap per-IP so a scripted loop can't
  // run up the model bill.
  if (!(await allow(`tools-content-brief:${clientIp(req.headers)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  let keyword: string;
  try {
    const body = (await req.json()) as { keyword?: unknown };
    keyword = typeof body.keyword === "string" ? body.keyword : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a keyword." }, { status: 400 });
  }
  if (!keyword.trim()) return NextResponse.json({ error: "Enter a target keyword." }, { status: 400 });

  try {
    const brief = await aiContentBrief(keyword);
    return NextResponse.json(brief);
  } catch (err) {
    const msg = (err as Error)?.message;
    if (msg === "unconfigured") return NextResponse.json({ error: "This tool isn't available right now." }, { status: 503 });
    console.error("[content-brief] error:", err);
    return NextResponse.json({ error: "Couldn't generate a brief. Try again in a moment." }, { status: 502 });
  }
}

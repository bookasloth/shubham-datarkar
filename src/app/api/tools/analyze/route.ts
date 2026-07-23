import { NextResponse } from "next/server";
import { aiAnalyze, type AnalyzeKind } from "@/lib/tools/ai-analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: AnalyzeKind[] = ["copy-analyzer", "headline-tester"];

export async function POST(req: Request) {
  let kind: string, text: string;
  try {
    const body = (await req.json()) as { kind?: unknown; text?: unknown };
    kind = typeof body.kind === "string" ? body.kind : "";
    text = typeof body.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with kind and text." }, { status: 400 });
  }
  if (!KINDS.includes(kind as AnalyzeKind)) return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
  if (!text.trim()) return NextResponse.json({ error: "Enter some text to analyze." }, { status: 400 });

  try {
    const result = await aiAnalyze(kind as AnalyzeKind, text);
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error)?.message;
    if (msg === "unconfigured") {
      return NextResponse.json({ error: "This tool isn't available right now." }, { status: 503 });
    }
    console.error("[analyze] error:", err);
    return NextResponse.json({ error: "Couldn't analyze that. Try again in a moment." }, { status: 502 });
  }
}

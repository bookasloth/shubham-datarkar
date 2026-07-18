import { NextResponse, type NextRequest } from "next/server";
import { getMemberContext } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { runArticleStep } from "@/lib/kalamai/writing-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby ceiling; covers a streamed W2/W4 draft call

/** Advance one article-writing job by exactly one transition. Ownership-checked. */
export async function POST(req: NextRequest) {
  const ctx = await getMemberContext();
  if (!ctx.user) return NextResponse.json({ error: "Sign in to use KalamAI." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing article id." }, { status: 400 });

  const { data } = await supabaseAdmin().from("kalamai_articles").select("user_id").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (data.user_id !== ctx.user.id && ctx.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await runArticleStep(id);
  return NextResponse.json(result);
}

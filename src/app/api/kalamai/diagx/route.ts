// TEMPORARY diagnostic — remove after root-causing the step-route 500.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const results: Record<string, string> = {};
  const tries: [string, () => Promise<unknown>][] = [
    ["jsdom", () => import("jsdom")],
    ["readability", () => import("@mozilla/readability")],
    ["extract", () => import("@/lib/kalamai/extract")],
    ["embed", () => import("@/lib/kalamai/embed")],
    ["analysis-server", () => import("@/lib/kalamai/analysis-server")],
  ];
  for (const [name, fn] of tries) {
    try { await fn(); results[name] = "OK"; }
    catch (e) { results[name] = String((e as Error)?.stack ?? e).slice(0, 900); }
  }
  return Response.json(results);
}

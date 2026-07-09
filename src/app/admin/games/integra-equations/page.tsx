import Link from "next/link";
import { getUpcomingIntegraEquations, type IntegraEquationRow } from "@/lib/games/admin-queries";
import { upsertIntegraEquation } from "@/lib/games/admin-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminIntegraEquationsPage() {
  let rows: IntegraEquationRow[] | null = null;
  let loadError = false;
  try {
    rows = await getUpcomingIntegraEquations();
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Integra equations</h1>
        <Link href="/admin/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Games
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Override any future day&apos;s equation. Past and today&apos;s equations are frozen to preserve
        results. Blank rows fall back to the built-in list. Must be a valid 7-character equation, e.g.{" "}
        <code>12+3=15</code>.
      </p>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load equations. Fetch error, not an empty list.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Puzzle</th>
                <th className="px-3 py-2">Equation</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows?.map((r) => (
                <tr key={r.puzzleNumber}>
                  <td className="px-3 py-2 text-muted-foreground">#{r.puzzleNumber}</td>
                  <td className="px-3 py-2">
                    {r.editable ? (
                      <form action={upsertIntegraEquation} className="flex items-center gap-2">
                        <input type="hidden" name="puzzle_number" value={r.puzzleNumber} />
                        <input
                          name="equation"
                          defaultValue={r.equation}
                          maxLength={7}
                          className="w-28 rounded-btn border border-border bg-background px-2 py-1 font-mono text-sm"
                        />
                        <Button size="sm" type="submit">Save</Button>
                      </form>
                    ) : (
                      <span className="font-mono">{r.equation}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {!r.editable ? "frozen" : r.overridden ? "override" : "default"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

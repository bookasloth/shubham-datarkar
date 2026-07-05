import Link from "next/link";
import { getUpcomingAlfazyWords, type AlfazyWordRow } from "@/lib/games/admin-queries";
import { upsertAlfazyWord } from "@/lib/games/admin-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminAlfazyWordsPage() {
  let rows: AlfazyWordRow[] | null = null;
  let loadError = false;
  try {
    rows = await getUpcomingAlfazyWords();
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Alfazy words</h1>
        <Link href="/admin/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Games
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Only future puzzles are editable. Past and today&apos;s words are frozen to preserve results.
      </p>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load words. Fetch error, not an empty list.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Puzzle</th>
                <th className="px-3 py-2">Word</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows?.map((r) => (
                <tr key={r.puzzleNumber}>
                  <td className="px-3 py-2 text-muted-foreground">#{r.puzzleNumber}</td>
                  <td className="px-3 py-2">
                    {r.editable ? (
                      <form action={upsertAlfazyWord} className="flex items-center gap-2">
                        <input type="hidden" name="puzzle_number" value={r.puzzleNumber} />
                        <input
                          name="word"
                          defaultValue={r.word}
                          maxLength={5}
                          className="w-24 rounded-btn border border-border bg-background px-2 py-1 font-mono text-sm"
                        />
                        <Button size="sm" type="submit">Save</Button>
                      </form>
                    ) : (
                      <span className="font-mono">{r.word}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {r.editable ? "editable" : "frozen"}
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

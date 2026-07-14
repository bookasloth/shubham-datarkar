// scripts/seed-alfazy-puzzles.ts
// Run: npx tsx scripts/seed-alfazy-puzzles.ts > alfazy-seed.sql
// Emits INSERTs freezing the code answers for puzzles 0..(today+60).
import { answerFor } from "@/lib/games/alfazy";
import { puzzleNumberFor } from "@/lib/daily";

const today = puzzleNumberFor("alfazy");
const end = today + 60;

const values: string[] = [];
for (let n = 0; n <= end; n++) {
  values.push(`(${n}, '${answerFor(n)}')`);
}

process.stdout.write(
  "insert into public.alfazy_puzzles (puzzle_number, word) values\n" +
    values.join(",\n") +
    "\non conflict (puzzle_number) do nothing;\n",
);

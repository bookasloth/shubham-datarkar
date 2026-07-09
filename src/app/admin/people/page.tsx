import { getPeople } from "@/lib/people/queries";
import { PeopleTable } from "./people-table";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  const people = await getPeople();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">People</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          {people.length} {people.length === 1 ? "person" : "people"} — one row per email across every behavior.
        </p>
      </div>
      <PeopleTable rows={people} />
    </div>
  );
}

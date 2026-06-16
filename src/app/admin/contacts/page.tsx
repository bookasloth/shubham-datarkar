import { getContacts } from "@/lib/contact/queries";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await getContacts(200);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submissions from the contact form. {contacts.length} total.
      </p>

      <div className="mt-6 grid gap-3">
        {contacts.length === 0 && (
          <p className="rounded-card border border-border p-6 text-sm text-muted-foreground">
            No submissions yet.
          </p>
        )}

        {contacts.map((c) => (
          <article key={c.id} className="rounded-card border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-medium">{c.name}</span>{" "}
                <a href={`mailto:${c.email}`} className="text-sm text-muted-foreground hover:underline">
                  {c.email}
                </a>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
                {!c.notified && <span className="ml-2 text-warning">not emailed</span>}
              </span>
            </div>

            {(c.projectType || c.budget) && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {c.projectType && <span>{c.projectType}</span>}
                {c.budget && <span>· {c.budget}</span>}
              </div>
            )}

            <p className="mt-2 whitespace-pre-wrap text-sm">{c.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

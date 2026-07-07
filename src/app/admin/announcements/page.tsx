import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { deleteAnnouncement, saveAnnouncement } from "@/lib/members/admin-actions";
import { PageHeader, StatusBadge } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  message: string;
  href: string | null;
  active: boolean;
  ends_at: string | null;
  created_at: string;
};

export default async function AnnouncementsPage() {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("announcements")
    .select("id,message,href,active,ends_at,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Announcements"
        description="The members area shows the newest active announcement as a banner."
      />

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-base font-semibold">New announcement</h2>
        <form action={saveAnnouncement} className="mt-4 grid max-w-xl gap-3">
          <Input name="message" placeholder="Message" required />
          <Input name="href" placeholder="Link (optional, e.g. /members/resources/…)" />
          <div className="flex items-center gap-4">
            <Input name="ends_at" type="datetime-local" className="w-56" />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="active" defaultChecked /> Active
            </label>
            <Button type="submit" size="sm">Publish</Button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        {rows.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3"
          >
            <StatusBadge tone={a.active ? "success" : "neutral"}>
              {a.active ? "active" : "off"}
            </StatusBadge>
            <span className="min-w-0 flex-1 truncate text-sm">{a.message}</span>
            {a.href && <span className="truncate text-xs text-muted-foreground">{a.href}</span>}
            <form action={saveAnnouncement} className="inline-flex">
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="message" value={a.message} />
              <input type="hidden" name="href" value={a.href ?? ""} />
              {!a.active && <input type="hidden" name="active" value="on" />}
              <Button type="submit" variant="outline" size="sm">
                {a.active ? "Deactivate" : "Activate"}
              </Button>
            </form>
            <form action={deleteAnnouncement} className="inline-flex">
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit" variant="outline" size="sm">Delete</Button>
            </form>
          </div>
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </section>
    </div>
  );
}

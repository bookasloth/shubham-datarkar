import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { deleteTool, saveTool } from "@/lib/members/admin-actions";
import { PageHeader, StatusBadge } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type ToolRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  component: string;
  status: string;
  sort: number;
};

const CELL = "h-8 rounded-btn border border-border bg-background px-2 text-sm";

export default async function ToolsAdminPage() {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("member_tools")
    .select("id,slug,name,description,component,status,sort")
    .order("sort");
  const tools = (data ?? []) as ToolRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member tools"
        description="Registry for interactive tools. The component key must exist in the client tool registry (one component + one registry line per tool)."
      />

      <div className="space-y-3">
        {tools.map((t) => (
          <form
            key={t.id}
            action={saveTool}
            className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-4"
          >
            <input type="hidden" name="slug" value={t.slug} />
            <span className="w-32 truncate font-mono text-xs text-muted-foreground">{t.slug}</span>
            <input name="name" defaultValue={t.name} className={`${CELL} w-44`} />
            <input name="component" defaultValue={t.component} className={`${CELL} w-36 font-mono`} />
            <input name="description" defaultValue={t.description ?? ""} className={`${CELL} min-w-40 flex-1`} />
            <select name="status" defaultValue={t.status} className={CELL}>
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="archived">archived</option>
            </select>
            <input type="hidden" name="sort" value={t.sort} />
            <StatusBadge tone={t.status === "live" ? "success" : "neutral"}>{t.status}</StatusBadge>
            <Button type="submit" variant="outline" size="sm">Save</Button>
            <Button type="submit" formAction={deleteTool} name="id" value={t.id} variant="outline" size="sm">
              Delete
            </Button>
          </form>
        ))}

        <form
          action={saveTool}
          className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-border p-4"
        >
          <Input name="slug" placeholder="tool-slug" className="h-8 w-32" required />
          <Input name="name" placeholder="Name" className="h-8 w-44" required />
          <Input name="component" placeholder="registry-key" className="h-8 w-36 font-mono" required />
          <Input name="description" placeholder="Description" className="h-8 min-w-40 flex-1" />
          <select name="status" defaultValue="draft" className={CELL}>
            <option value="draft">draft</option>
            <option value="live">live</option>
          </select>
          <input type="hidden" name="sort" value={tools.length + 1} />
          <Button type="submit" size="sm">Add</Button>
        </form>
      </div>
    </div>
  );
}

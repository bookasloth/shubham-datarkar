import { Download } from "lucide-react";
import { getSubscribers } from "@/lib/subscribers/queries";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{subscribers.length} total</span>
          <a
            href="/admin/subscribers/export"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={subscribers.length === 0}
          >
            <Download />
            Download CSV
          </a>
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-muted-foreground">
                  No subscribers yet.
                </td>
              </tr>
            )}
            {subscribers.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.email}</td>
                <td className="p-3 text-muted-foreground">{s.source ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{s.status}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

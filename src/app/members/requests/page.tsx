import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { getMyRequests } from "@/lib/members/member-queries";
import { RequestForm } from "@/components/members/request-form";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({ title: "Requests", path: "/members/requests", noIndex: true });

// No `declined` entry — getMyRequests filters those out, so they never render here.
const STATUS_STYLES: Record<string, string> = {
  open: "bg-accent text-muted-foreground",
  planned: "bg-foreground/10 text-foreground",
  shipped: "bg-success/15 text-success",
};

export default async function RequestsPage() {
  await requireMember("/members/requests");
  const requests = await getMyRequests();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask for a template, prompt, tool, article, or a review. Requests shape what ships next.
        </p>
      </header>

      <RequestForm />

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Your requests</h2>
        {requests.map((r) => (
          <div key={r.id} className="rounded-card border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-btn px-2 py-0.5 text-[11px] font-medium capitalize",
                  STATUS_STYLES[r.status] ?? STATUS_STYLES.open,
                )}
              >
                {r.status}
              </span>
              <span className="rounded-btn bg-accent px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                {r.kind}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{r.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            </div>
            {r.details && (
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                {r.details}
              </p>
            )}
          </div>
        ))}
        {!requests.length && (
          <p className="text-sm text-muted-foreground">
            Nothing yet. Your first request goes straight to the roadmap.
          </p>
        )}
      </section>
    </div>
  );
}

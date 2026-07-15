import { PageHeader } from "@/components/admin";
import { EMAIL_CATALOG, type EmailCategory } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const CATEGORIES: EmailCategory[] = [
  "Authentication",
  "Newsletter",
  "Community",
  "Membership",
  "Requests",
  "Engagement",
  "Contact",
  "Games",
];

const humourStyle: Record<string, string> = {
  High: "bg-brand/15 text-brand",
  Subtle: "bg-blue-500/10 text-blue-600",
  None: "bg-muted text-muted-foreground",
};

export default function EmailPreviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Email preview"
        description={`All ${EMAIL_CATALOG.length} branded templates rendered with sample data. Read-only — nothing sends from here.`}
      />

      {CATEGORIES.map((cat) => {
        const entries = EMAIL_CATALOG.filter((e) => e.category === cat);
        if (!entries.length) return null;
        return (
          <section key={cat} className="space-y-4">
            <h2 className="text-lg font-semibold">{cat}</h2>
            <div className="grid gap-6 xl:grid-cols-2">
              {entries.map((e) => {
                const email = e.render();
                return (
                  <div key={e.key} className="overflow-hidden rounded-card border border-border bg-card">
                    <div className="space-y-1 border-b border-border px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{e.label}</span>
                        <span className={`rounded-btn px-1.5 py-0.5 text-[11px] font-medium ${humourStyle[e.humour]}`}>
                          {e.humour} humour
                        </span>
                        <span className="rounded-btn bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          gif: {e.gifKey}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Subject:</span> {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">To:</span> {e.recipient} · {e.trigger}
                      </p>
                    </div>
                    <iframe
                      title={e.label}
                      srcDoc={email.html}
                      className="h-[640px] w-full border-0 bg-white"
                      sandbox=""
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

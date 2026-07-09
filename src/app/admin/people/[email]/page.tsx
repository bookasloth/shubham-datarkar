import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPersonTimeline } from "@/lib/people/queries";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_TONE: Record<string, "success" | "info" | "neutral" | "warning"> = {
  contact: "info",
  newsletter: "neutral",
  donation: "success",
  game: "neutral",
  membership: "success",
};

export default async function PersonTimelinePage({ params }: { params: Promise<{ email: string }> }) {
  const { email: raw } = await params;
  const email = decodeURIComponent(raw);
  const timeline = await getPersonTimeline(email);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/people" className="inline-flex items-center gap-1.5 text-xs text-admin-text-muted hover:text-admin-text">
        <ArrowLeft className="size-3.5" /> All people
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">{email}</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          {timeline.length} {timeline.length === 1 ? "event" : "events"} across every behavior.
        </p>
      </div>

      {timeline.length === 0 ? (
        <p className="text-sm text-admin-text-muted">No activity found for this email.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {timeline.map((e, i) => (
            <li key={i} className="flex gap-3 rounded-card border border-admin-border p-3">
              <StatusBadge tone={KIND_TONE[e.kind] ?? "neutral"}>{e.kind}</StatusBadge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-admin-text">{e.title}</p>
                {e.detail && <p className="mt-0.5 text-sm text-admin-text-muted break-words">{e.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-admin-text-muted">{e.occurredAt ? formatDate(e.occurredAt) : "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

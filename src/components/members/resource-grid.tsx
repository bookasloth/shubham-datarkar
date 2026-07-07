import { SearchX } from "lucide-react";
import type { ResourceCard as ResourceCardData } from "@/lib/resources/types";
import type { MemberRole } from "@/lib/members/access";
import { canAccess } from "@/lib/members/access";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "./resource-card";

export function ResourceGrid({
  resources,
  role,
  emptyTitle = "No resources found",
  emptyDescription = "Try a different search or clear the filters.",
}: {
  resources: ResourceCardData[];
  role: MemberRole;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!resources.length) {
    return <EmptyState icon={<SearchX />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} locked={!canAccess(r.visibility, role)} />
      ))}
    </div>
  );
}

import { SearchX } from "lucide-react";
import type { ResourceCard as ResourceCardData } from "@/lib/resources/types";
import { can, type Capability } from "@/lib/members/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "./resource-card";

/** True when this resource is gated and the viewer lacks the capability. */
export function isLocked(
  resource: Pick<ResourceCardData, "required_capability">,
  capabilities: ReadonlySet<string>,
): boolean {
  const cap = resource.required_capability;
  if (!cap || cap === "admin_only") return false;
  return !can(capabilities, cap as Capability);
}

export function ResourceGrid({
  resources,
  capabilities,
  emptyTitle = "No resources found",
  emptyDescription = "Try a different search or clear the filters.",
}: {
  resources: ResourceCardData[];
  capabilities: ReadonlySet<string>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!resources.length) {
    return <EmptyState icon={<SearchX />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} locked={isLocked(r, capabilities)} />
      ))}
    </div>
  );
}

import { buildMetadata } from "@/lib/seo";
import { UpdatePost } from "@/components/support/update-post";
import { supportUpdates } from "@/lib/data/support-content";

export const metadata = buildMetadata({
  title: "Updates",
  description: "What I'm building, writing, and shipping — straight from the desk.",
  path: "/support/updates",
});

export default function UpdatesPage() {
  if (!supportUpdates.length) {
    return (
      <div className="rounded-card border border-border bg-card p-10 text-center">
        <h2 className="font-display text-lg font-bold tracking-tight">No updates yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Check back soon — or support to follow along as things ship.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What I&apos;m building, writing, and shipping — newest first.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {supportUpdates.map((post) => (
          <UpdatePost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

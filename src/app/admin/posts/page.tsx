import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAllPostsAdmin();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <Button asChild size="sm">
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      </div>
      <div className="grid gap-2">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        )}
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/admin/posts/${p.id}`}
            className="flex items-center justify-between rounded-card border border-border p-3 hover:bg-accent"
          >
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted-foreground">
              {p.status} · {p.category}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

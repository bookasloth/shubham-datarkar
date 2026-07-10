import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { listFeed } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";

export const metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/members/login?next=/community/bookmarks");

  const posts = await listFeed({ sort: "new", window: "all", bookmarked: true, limit: 50 });

  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Bookmarks</h1>
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          Nothing bookmarked yet.
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}

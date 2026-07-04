import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { AdminButton, PageHeader } from "@/components/admin";
import { PostsTable } from "./posts-table";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAllPostsAdmin();
  return (
    <div>
      <PageHeader
        title="Posts"
        actions={
          <AdminButton asChild size="sm">
            <Link href="/admin/posts/new">New post</Link>
          </AdminButton>
        }
      />
      <PostsTable rows={posts} />
    </div>
  );
}

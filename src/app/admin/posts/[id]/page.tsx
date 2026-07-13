import { notFound } from "next/navigation";
import { getPostByIdAdmin } from "@/lib/blog/queries";
import { updatePost, deletePost } from "@/lib/blog/actions";
import { PostEditor } from "@/components/admin/post-editor";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByIdAdmin(id);
  if (!post) notFound();

  const update = updatePost.bind(null, id);
  const remove = deletePost.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
        <form action={remove}>
          <SubmitButton variant="outline" size="sm">
            Delete
          </SubmitButton>
        </form>
      </div>
      <PostEditor
        action={update}
        post={{
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          category: post.category,
          tags: post.tags,
          featured: post.featured ?? false,
          status: post.status,
          publishedAt: post.publishedAt,
          body: post.body,
          seoTitle: post.seoTitle,
          ogTitle: post.ogTitle,
          ogDescription: post.ogDescription,
        }}
      />
    </div>
  );
}

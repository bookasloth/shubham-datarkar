import { createPost } from "@/lib/blog/actions";
import { PostEditor } from "@/components/admin/post-editor";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New post</h1>
      <PostEditor action={createPost} />
    </div>
  );
}

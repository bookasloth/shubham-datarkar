import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { viewerCanPost } from "@/lib/community/queries";
import { Composer } from "@/components/community/composer";

export const metadata = buildMetadata({ title: "New post", path: "/community/compose", noIndex: true });

export default async function ComposePage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/members/login?next=/community/compose");
  if (!(await viewerCanPost())) redirect("/community");
  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">New post</h1>
      <Composer />
    </div>
  );
}

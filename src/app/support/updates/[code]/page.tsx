import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { UpdateCard } from "@/components/support/update-card";
import { CommentSection } from "@/components/support/comment-section";
import { getUpdateByCode } from "@/lib/support/updates";
import { getComments } from "@/lib/support/comments";
import { buildCommentTree } from "@/lib/support/comment-tree";
import { getVerifiedCommenter } from "@/lib/support/comment-auth";
import { getAdminUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) return buildMetadata({ title: "Update", path: `/support/updates/${code}`, noIndex: true });
  const text = update.body.slice(0, 140) || "An update from Shubham Datarkar.";
  return buildMetadata({ title: "Update", description: text, path: `/support/updates/${code}`, noIndex: true });
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) notFound();

  const [commentRows, me, admin] = await Promise.all([
    getComments(code),
    getVerifiedCommenter(),
    getAdminUser(),
  ]);

  return (
    <div className="grid gap-6">
      <UpdateCard update={update} />

      <div className="flex items-center justify-between rounded-card border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Like what I&apos;m building?</p>
        <Button asChild size="sm">
          <Link href="/support">Support</Link>
        </Button>
      </div>

      <CommentSection
        code={code}
        comments={buildCommentTree(commentRows)}
        initialName={me?.name ?? null}
        isAdmin={!!admin}
      />
    </div>
  );
}

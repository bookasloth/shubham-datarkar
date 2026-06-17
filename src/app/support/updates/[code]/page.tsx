import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { UpdateCard } from "@/components/support/update-card";
import { getUpdateByCode } from "@/lib/support/updates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) return buildMetadata({ title: "Update", path: `/support/updates/${code}` });
  const text = update.body.slice(0, 140) || "An update from Shubham Datarkar.";
  return buildMetadata({ title: "Update", description: text, path: `/support/updates/${code}` });
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const update = await getUpdateByCode(code);
  if (!update) notFound();

  return (
    <div className="grid gap-6">
      <UpdateCard update={update} />

      <div className="flex items-center justify-between rounded-card border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Like what I&apos;m building?</p>
        <Button asChild size="sm">
          <Link href="/support">Support</Link>
        </Button>
      </div>

      {/* Comments slot — sub-project 4. Reactions slot — sub-project 5. */}
      <div id="comments" />
    </div>
  );
}

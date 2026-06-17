import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUpdatesFeed, getThankyouImages } from "@/lib/support/updates";
import { removeUpdate } from "@/lib/support/updates-actions";
import { ThankyouImages } from "@/components/admin/thankyou-images";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  text: "Text", image: "Image", video: "Video", thankyou: "Thank-you",
};

export default async function AdminUpdatesPage() {
  const [updates, thankyouImages] = await Promise.all([getUpdatesFeed(), getThankyouImages()]);

  return (
    <div className="grid gap-8">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          <Button asChild size="sm"><Link href="/admin/updates/new">New</Link></Button>
        </div>
        <div className="grid gap-2">
          {updates.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {updates.map((u) => (
            <div key={u.code} className="flex items-center justify-between rounded-card border border-border p-3">
              <Link href={`/support/updates/${u.code}`} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{TYPE_LABEL[u.type]}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {u.body.slice(0, 60) || "—"}
                </span>
              </Link>
              <span className="ml-3 text-xs text-muted-foreground">#{u.code}</span>
              <form action={removeUpdate.bind(null, u.code) as (payload: FormData) => Promise<void>} className="ml-3">
                <button type="submit" className="text-xs text-destructive hover:underline">Delete</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <ThankyouImages images={thankyouImages} />
    </div>
  );
}

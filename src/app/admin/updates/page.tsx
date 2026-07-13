import Link from "next/link";
import { PageHeader, AdminButton } from "@/components/admin";
import { getUpdatesFeed, getThankyouImages } from "@/lib/support/updates";
import { removeUpdate, attachUpdateImage } from "@/lib/support/updates-actions";
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
        <PageHeader
          title="Updates"
          actions={
            <AdminButton asChild size="sm">
              <Link href="/admin/updates/new">New</Link>
            </AdminButton>
          }
        />
        <div className="grid gap-2">
          {updates.length === 0 && <p className="text-sm text-admin-text-muted">Nothing yet.</p>}
          {updates.map((u) => {
            const imgUrl = (u.media as { url?: string }).url;
            const imageable = u.type === "thankyou" || u.type === "image";
            return (
            <div key={u.code} className="flex items-center justify-between rounded-card border border-admin-border p-3">
              <Link href={`/support/updates/${u.code}`} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{TYPE_LABEL[u.type]}</span>
                <span className="ml-2 text-sm text-admin-text-muted">
                  {u.body.slice(0, 60) || "—"}
                </span>
              </Link>
              {imageable && (
                <div className="ml-3 flex items-center gap-2">
                  {imgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl} alt="" className="size-9 rounded border border-admin-border object-cover" />
                  )}
                  <form action={attachUpdateImage} className="flex items-center gap-1.5">
                    <input type="hidden" name="code" value={u.code} />
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      required
                      className="w-36 text-xs text-admin-text-muted file:mr-2 file:rounded file:border-0 file:bg-admin-surface-hover file:px-2 file:py-1 file:text-admin-text hover:file:bg-admin-border"
                    />
                    <button type="submit" className="text-xs text-admin-accent hover:underline">
                      {imgUrl ? "Replace" : "Add"}
                    </button>
                  </form>
                </div>
              )}
              <span className="ml-3 text-xs text-admin-text-muted">#{u.code}</span>
              <form action={removeUpdate.bind(null, u.code) as (payload: FormData) => Promise<void>} className="ml-3">
                <button type="submit" className="text-xs text-admin-danger hover:underline">Delete</button>
              </form>
            </div>
            );
          })}
        </div>
      </div>

      <ThankyouImages images={thankyouImages} />
    </div>
  );
}

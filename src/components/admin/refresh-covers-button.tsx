"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin";
import { useToast } from "@/components/ui/toast";
import { refreshCoversFromGoogleBooks } from "@/lib/books/actions";

/** Bulk-pull cover art from Google Books for every book. */
export function RefreshCoversButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  return (
    <AdminButton
      size="sm"
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await refreshCoversFromGoogleBooks();
        setLoading(false);
        if ("error" in res) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({
          title: "Covers refreshed",
          description: `Updated ${res.updated}, skipped ${res.skipped}, failed ${res.failed}`,
          variant: res.failed ? "warning" : "success",
        });
        router.refresh();
      }}
    >
      <RefreshCw className={loading ? "animate-spin" : ""} />
      {loading ? "Refreshing…" : "Refresh covers"}
    </AdminButton>
  );
}

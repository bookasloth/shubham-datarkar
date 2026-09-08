"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin";
import { useToast } from "@/components/ui/toast";
import { refreshArtworkFromTmdb } from "@/lib/movies/actions";

/** Bulk-pull poster/backdrop art from TMDB for every movie. */
export function RefreshArtworkButton() {
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
        const res = await refreshArtworkFromTmdb();
        setLoading(false);
        if ("error" in res) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({
          title: "Artwork refreshed",
          description: `${res.updated} updated · ${res.skipped} skipped · ${res.failed} failed`,
          variant: res.failed ? "warning" : "success",
        });
        router.refresh();
      }}
    >
      <RefreshCw className={loading ? "animate-spin" : ""} />
      {loading ? "Refreshing…" : "Refresh artwork"}
    </AdminButton>
  );
}

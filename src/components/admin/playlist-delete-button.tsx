"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deletePlaylist } from "@/lib/playlists/actions";

export function PlaylistDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await deletePlaylist(id);
    setBusy(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: "Deleted", variant: "success" });
    router.push("/admin/playlists");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onDelete} loading={busy}>
      <Trash2 /> Delete
    </Button>
  );
}

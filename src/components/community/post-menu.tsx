"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reportPost, deleteOwnPost } from "@/lib/community/engage-actions";

export function PostMenu({ postId, isOwner }: { postId: string; isOwner: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function onReport() {
    const reason = window.prompt("Why are you reporting this post? (optional)") ?? "";
    start(async () => {
      const r = await reportPost(postId, reason);
      setNote("error" in r ? r.error : "Reported. Thanks.");
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    start(async () => {
      const r = await deleteOwnPost(postId);
      if ("error" in r) setNote(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Post actions"
          className="rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onReport}>Report</DropdownMenuItem>
          {isOwner && <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {note && <p className="absolute right-0 top-7 whitespace-nowrap text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

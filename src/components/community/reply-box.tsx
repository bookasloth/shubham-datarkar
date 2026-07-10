"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "@/lib/community/engage-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX = 500;

export function ReplyBox({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const over = body.length > MAX;

  function submit() {
    start(async () => {
      const r = await createReply(postId, body);
      if ("error" in r) {
        setError(r.error);
      } else {
        setError(null);
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply"
        rows={2}
        className="resize-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-xs", over ? "text-danger" : "text-muted-foreground")}>
          {body.length}/{MAX}
        </span>
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={over || body.trim().length === 0}
          onClick={submit}
        >
          Reply
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

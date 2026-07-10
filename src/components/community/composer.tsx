"use client";
import { useActionState, useState } from "react";
import { createPost, type CreatePostState } from "@/lib/community/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "text", label: "Text" },
  { key: "image", label: "Image" },
  { key: "youtube", label: "YouTube" },
] as const;

const MAX = 500;

export function Composer() {
  const [type, setType] = useState<(typeof TABS)[number]["key"]>("text");
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState<CreatePostState, FormData>(
    createPost,
    undefined,
  );
  const over = body.length > MAX;

  return (
    <form action={formAction} className="border-b border-border px-4 py-3">
      <input type="hidden" name="type" value={type} />

      <div className="mb-2 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-btn px-2.5 py-1 text-xs transition-ui",
              type === t.key
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={type === "text" ? "What are you building?" : "Say something (optional)"}
        rows={3}
        className="resize-none"
      />

      {type === "image" && (
        <input
          type="file"
          name="images"
          multiple
          accept="image/*"
          className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-btn file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
      )}

      {type === "youtube" && (
        <input
          type="url"
          name="youtubeUrl"
          placeholder="https://youtube.com/watch?v=..."
          className="mt-2 w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
        />
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-xs", over ? "text-danger" : "text-muted-foreground")}>
          {body.length}/{MAX}
        </span>
        <Button type="submit" size="sm" loading={pending} disabled={over}>
          Post
        </Button>
      </div>

      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-success">Posted.</p>}
    </form>
  );
}

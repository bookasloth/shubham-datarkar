"use client";
import { useActionState, useState } from "react";
import { X, Type, Image as ImageIcon, Video, BarChart3 } from "lucide-react";
import { createPost, type CreatePostState } from "@/lib/community/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "text", label: "Text", Icon: Type },
  { key: "image", label: "Image", Icon: ImageIcon },
  { key: "youtube", label: "YouTube", Icon: Video },
  { key: "poll", label: "Poll", Icon: BarChart3 },
] as const;

const MAX = 500;
const MAX_OPTIONS = 4;

export function Composer({
  name,
  username,
}: {
  name?: string | null;
  username?: string | null;
}) {
  const [type, setType] = useState<(typeof TABS)[number]["key"]>("text");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [state, formAction, pending] = useActionState<CreatePostState, FormData>(
    createPost,
    undefined,
  );
  const over = body.length > MAX;

  function setOption(i: number, value: string) {
    setOptions(options.map((o, idx) => (idx === i ? value : o)));
  }

  return (
    <form action={formAction} className="border-b border-border px-4 py-3">
      <input type="hidden" name="type" value={type} />

      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Welcome back{name ? `, ${name}` : ""}
          {username && username !== name && (
            <span className="ml-1.5 font-normal text-muted-foreground">@{username}</span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what your community is up to. Share something.
        </p>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            aria-pressed={type === t.key}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-card border px-2 py-3 text-xs transition-ui",
              type === t.key
                ? "border-foreground bg-accent font-medium text-foreground"
                : "border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <t.Icon className="size-5" />
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

      {type === "poll" && (
        <div className="mt-2 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                name="pollOptions"
                value={o}
                onChange={(e) => setOption(i, e.target.value)}
                maxLength={80}
                placeholder={`Option ${i + 1}`}
                className="w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  className="rounded-btn p-1 text-muted-foreground transition-ui hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}

          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent"
            >
              Add option
            </button>
          )}

          <label className="block text-xs text-muted-foreground">
            Closes (optional)
            <input
              type="datetime-local"
              name="pollClosesAt"
              className="mt-1 block w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none"
            />
          </label>
        </div>
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

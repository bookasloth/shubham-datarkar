"use client";
import { useActionState, useEffect, useState } from "react";
import { X, Type, Image as ImageIcon, Video, BarChart3 } from "lucide-react";
import { createPost, type CreatePostState } from "@/lib/community/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "text", label: "Text", Icon: Type },
  { key: "image", label: "Image", Icon: ImageIcon },
  { key: "youtube", label: "YouTube", Icon: Video },
  { key: "poll", label: "Poll", Icon: BarChart3 },
] as const;

const MAX = 500;
const MAX_OPTIONS = 4;

const inputCls =
  "w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm focus:border-brand focus:outline-none";

export function Composer({
  name,
  username,
  onPosted,
  initialBody,
}: {
  name?: string | null;
  username?: string | null;
  onPosted?: () => void;
  /** Seeds the box — used by /community?compose=, e.g. a shared game result. */
  initialBody?: string;
}) {
  const [type, setType] = useState<(typeof TABS)[number]["key"]>("text");
  const [body, setBody] = useState(initialBody ?? "");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [quiz, setQuiz] = useState(false);
  const [correct, setCorrect] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState<CreatePostState, FormData>(
    createPost,
    undefined,
  );
  const over = body.length > MAX;

  useEffect(() => {
    if (state?.ok) onPosted?.();
  }, [state?.ok, onPosted]);

  function setOption(i: number, value: string) {
    setOptions(options.map((o, idx) => (idx === i ? value : o)));
  }

  function removeOption(r: number) {
    setOptions(options.filter((_, idx) => idx !== r));
    // Keep `correct` pointing at the same option after the row shifts.
    setCorrect((c) => (c === null ? c : c === r ? null : c > r ? c - 1 : c));
  }

  return (
    <form action={formAction} className="border-b border-border px-4 py-3">
      <input type="hidden" name="type" value={type} />
      {type === "poll" && <input type="hidden" name="pollMode" value={quiz ? "quiz" : "poll"} />}

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

      <div className="mb-4 flex border-b border-border">
        {TABS.map((t) => {
          const active = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              aria-pressed={active}
              className={cn(
                "-mb-px flex flex-1 flex-col items-center gap-1 border-b-2 px-2 py-2 text-xs transition-ui",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.Icon className="size-5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {type === "text" && (
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What are you building?"
          rows={3}
          className="resize-none"
        />
      )}

      {type === "image" && (
        <div className="space-y-2">
          <Dropzone name="images" accept="image/*" hint="JPG, PNG, WebP, GIF or AVIF, up to 5MB" />
          <input
            type="text"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            placeholder="Add a caption…"
            className={inputCls}
          />
        </div>
      )}

      {type === "youtube" && (
        <div className="space-y-2">
          <input type="url" name="youtubeUrl" placeholder="https://youtube.com/watch?v=..." className={inputCls} />
          <input
            type="text"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            placeholder="Add a caption…"
            className={inputCls}
          />
        </div>
      )}

      {type === "poll" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1 rounded-card border border-border p-1">
            {([false, true] as const).map((q) => (
              <button
                key={String(q)}
                type="button"
                onClick={() => setQuiz(q)}
                aria-pressed={quiz === q}
                className={cn(
                  "rounded-btn px-3 py-1.5 text-sm transition-ui",
                  quiz === q
                    ? "bg-foreground font-medium text-background"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {q ? "Quiz" : "Poll"}
              </button>
            ))}
          </div>

          <input
            type="text"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            placeholder="Ask a question…"
            className={inputCls}
          />

          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              {quiz && (
                <input
                  type="radio"
                  name="pollCorrect"
                  value={i}
                  checked={correct === i}
                  onChange={() => setCorrect(i)}
                  aria-label={`Mark option ${i + 1} correct`}
                  className="size-4 shrink-0 accent-foreground"
                />
              )}
              <input
                type="text"
                name="pollOptions"
                value={o}
                onChange={(e) => setOption(i, e.target.value)}
                maxLength={80}
                placeholder={`Option ${i + 1}`}
                className={inputCls}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => removeOption(i)}
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

          {quiz && (
            <p className="text-xs text-muted-foreground">Pick the radio next to the correct answer.</p>
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

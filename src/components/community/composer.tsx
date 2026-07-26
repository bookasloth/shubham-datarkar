"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  X,
  Type,
  Image as ImageIcon,
  BarChart3,
  Quote as QuoteIcon,
  Link2,
  MessagesSquare,
  ListChecks,
  Smile,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { createPost, type CreatePostState } from "@/lib/community/actions";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MentionField } from "./mention-field";
import { cn } from "@/lib/utils";

// Tumblr-style per-type colour, but on the LINEAR lucide glyphs (not solid
// fills). One accent per format so the row reads at a glance.
const TABS = [
  { key: "text", label: "Text", Icon: Type, color: "text-foreground" },
  { key: "image", label: "Photo", Icon: ImageIcon, color: "text-red-500" },
  { key: "quote", label: "Quote", Icon: QuoteIcon, color: "text-amber-500" },
  { key: "link", label: "Link", Icon: Link2, color: "text-emerald-500" },
  { key: "chat", label: "Chat", Icon: MessagesSquare, color: "text-sky-500" },
  { key: "poll", label: "Poll", Icon: BarChart3, color: "text-violet-500" },
  { key: "quiz", label: "Quiz", Icon: ListChecks, color: "text-pink-500" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Types that take a title and support the emoji picker on their main text field.
const TITLED: TabKey[] = ["text", "quote", "link", "chat"];

const EMOJI = [
  // smileys & people
  "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","☺️","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃",
  // gestures & body
  "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🙏","💪","🦾","✍️","🤳","💅",
  // hearts & symbols
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","💯","💥","💫","⭐","🌟","✨","⚡","🔥","🌈","☀️","🌙","💧","🎉","🎊","🎁","🏆","🥇","🎯","🚀","💡","🧠","👀","🙈","🙉","🙊","💬","💭","👑","💎","🔔","📌","📍","✅","❌","❓","❗","➕","➖","💰","📈","📉","🕹️","🎮","🎲","🎵","🎶","📚","✏️","🔗","⏰","🗓️",
  // food & drink
  "☕","🍵","🍺","🍻","🥂","🍷","🍕","🍔","🍟","🌮","🍩","🍪","🎂","🍰","🍫","🍿","🍎","🍌","🥑","🌶️","🧊",
  // animals & nature
  "🐶","🐱","🦊","🐼","🐨","🦁","🐯","🦄","🐢","🐝","🦋","🌸","🌷","🌻","🌵","🍀","🌿","🌊","🏔️",
];

const MAX = 500;
const MAX_OPTIONS = 4;
const MAX_TAGS = 5;

/** Pull #hashtags out of the body text so they post as tags, like every other
 *  social app. Lowercased, deduped by the caller, capped to the tag charset. */
function extractHashtags(text: string): string[] {
  return Array.from(text.matchAll(/#([a-z0-9_-]{1,32})/gi), (m) => m[1].toLowerCase());
}

const inputCls =
  "w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm focus:border-brand focus:outline-none";
const areaCls =
  "w-full resize-none rounded-input border border-border bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none";

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
  const [type, setType] = useState<TabKey>("text");
  const [body, setBody] = useState(initialBody ?? "");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correct, setCorrect] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    setCorrect((c) => (c === null ? c : c === r ? null : c > r ? c - 1 : c));
  }

  function commitTag() {
    const t = tagDraft.trim().replace(/^#/, "").toLowerCase();
    if (t && tags.length < MAX_TAGS && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }

  // Submit as a draft: flip the hidden flag, then let the same form action run.
  function saveDraft() {
    if (draftRef.current) draftRef.current.value = "1";
    formRef.current?.requestSubmit();
  }

  const showTitle = TITLED.includes(type);
  const canEmoji = TITLED.includes(type) || type === "image";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-b border-border px-4 py-3"
      // Every rounded-* utility reads these vars, so overriding them here caps
      // the radius of every control in the composer at 2px.
      style={{
        ["--radius-input" as string]: "2px",
        ["--radius-btn" as string]: "2px",
        ["--radius-card" as string]: "2px",
        ["--radius-img" as string]: "2px",
      }}
    >
      <input type="hidden" name="type" value={type === "quiz" ? "poll" : type} />
      <input type="hidden" name="saveDraft" ref={draftRef} value="" />
      {(type === "poll" || type === "quiz") && (
        <input type="hidden" name="pollMode" value={type === "quiz" ? "quiz" : "poll"} />
      )}
      {Array.from(new Set([...tags, ...extractHashtags(body)]))
        .slice(0, MAX_TAGS)
        .map((t) => (
          <input key={t} type="hidden" name="tags" value={t} />
        ))}

      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Welcome back{name ? `, ${name}` : ""}
          {username && username !== name && (
            <span className="ml-1.5 font-normal text-muted-foreground">@{username}</span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">Pick a format, then share something.</p>
      </div>

      {/* Type row — clickable icons switch the editor, one at a time. */}
      <div className="mb-4 grid grid-cols-7 gap-1 border-b border-border pb-2">
        {TABS.map((t) => {
          const active = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              aria-pressed={active}
              title={t.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-btn px-1 py-1.5 text-[11px] transition-ui",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <t.Icon className={cn("size-5", t.color)} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Fixed-height editor area so switching formats doesn't jump the card. */}
      <div className="min-h-[200px]">
      <div className={cn("mb-1 text-right text-xs", over ? "text-danger" : "text-muted-foreground")}>
        {body.length}/{MAX}
      </div>
      {showTitle && (
        <input
          type="text"
          name="title"
          maxLength={120}
          placeholder="Title"
          required
          className={cn(inputCls, "mb-2 font-medium")}
        />
      )}

      {type === "text" && (
        <MentionField
          as="textarea"
          name="body"
          value={body}
          onChange={setBody}
          placeholder="What are you building? Tag someone with @"
          rows={3}
          className={areaCls}
        />
      )}

      {type === "quote" && (
        <div className="space-y-2">
          <MentionField
            as="textarea"
            name="body"
            value={body}
            onChange={setBody}
            placeholder="“The quote…”"
            rows={3}
            className={cn(areaCls, "text-lg")}
          />
          <input type="text" name="source" maxLength={120} placeholder="— source (optional)" className={inputCls} />
        </div>
      )}

      {type === "link" && (
        <div className="space-y-2">
          <input type="url" name="linkUrl" placeholder="https://…" className={inputCls} />
          <MentionField
            as="textarea"
            name="body"
            value={body}
            onChange={setBody}
            placeholder="Say something about it (optional)"
            rows={2}
            className={areaCls}
          />
          <p className="text-xs text-muted-foreground">We&apos;ll pull the title and preview from the link.</p>
        </div>
      )}

      {type === "chat" && (
        <div className="space-y-1">
          <MentionField
            as="textarea"
            name="body"
            value={body}
            onChange={setBody}
            placeholder={"Me: so this actually works?\nAlso me: apparently"}
            rows={4}
            className={cn(areaCls, "font-mono")}
          />
          <p className="text-xs text-muted-foreground">One line each, as “Name: message”.</p>
        </div>
      )}

      {type === "image" && (
        <div className="space-y-2">
          <Dropzone name="images" accept="image/*,.gif" hint="JPG, PNG, WebP, GIF or AVIF, up to 5MB" />
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

      {(type === "poll" || type === "quiz") && (
        <div className="space-y-2">
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
              {type === "quiz" && (
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

          {type === "quiz" && (
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

      {/* Tags */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-foreground"
            >
              #{t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          {tags.length < MAX_TAGS && (
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  commitTag();
                }
              }}
              onBlur={commitTag}
              placeholder={tags.length ? "add tag" : "#add tags"}
              className="min-w-[80px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          )}
        </div>
      </div>

      </div>

      {/* Emoji + location row */}
      <div className="mt-2 flex items-center gap-2">
        {canEmoji && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Add emoji"
              className="rounded-btn p-1.5 text-muted-foreground transition-ui hover:bg-accent"
            >
              <Smile className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="grid max-h-64 w-[288px] grid-cols-8 gap-0.5 overflow-y-auto p-1">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setBody((b) => b + e)}
                  className="rounded-btn p-1 text-lg transition-ui hover:bg-accent"
                >
                  {e}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <span className="inline-flex flex-1 items-center gap-1.5 rounded-input border border-border px-2 focus-within:border-brand">
          <MapPin className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            name="place"
            maxLength={60}
            placeholder="Add location (optional)"
            className="flex-1 bg-transparent py-1 text-xs outline-none placeholder:text-muted-foreground"
          />
        </span>
      </div>

      {/* Schedule (revealed from the Post-now menu) */}
      {showSchedule && (
        <label className="mt-2 block text-xs text-muted-foreground">
          Publish at
          <input
            type="datetime-local"
            name="publishAt"
            className="mt-1 block w-full rounded-input border border-border bg-transparent px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none"
          />
        </label>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Audience only bites once Follow exists (it does, PR B) — a
              followers-only post is hidden from everyone else in the feed RPC. */}
          <select
            name="audience"
            defaultValue="everyone"
            aria-label="Who can see this"
            className="rounded-btn border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:border-brand focus:outline-none"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers</option>
          </select>
        </div>

        <div className="flex items-center">
          <Button type="submit" size="sm" loading={pending} disabled={over} className="rounded-r-none">
            Post now
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More post options"
              className="flex h-8 items-center rounded-r-btn border-l border-background/20 bg-foreground px-1.5 text-background"
            >
              <CalendarClock className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSchedule((s) => !s)}>
                {showSchedule ? "Cancel schedule" : "Schedule…"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveDraft}>Save draft</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <p className="mt-2 text-sm text-success">
          {state.state === "draft"
            ? "Saved to drafts."
            : state.state === "scheduled"
              ? "Scheduled."
              : state.publicId ? (
                  <>
                    Your post is live.{" "}
                    <a
                      href={`/community/p/${state.publicId}`}
                      className="font-medium underline underline-offset-2"
                    >
                      View post
                    </a>
                  </>
                ) : (
                  "Your post is live."
                )}
        </p>
      )}
    </form>
  );
}

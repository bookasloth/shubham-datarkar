"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createReply } from "@/lib/community/engage-actions";
import { validateImageFile, ALLOWED_IMAGE_TYPES } from "@/lib/media/image-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CommunityAvatar } from "./community-avatar";
import { MentionField } from "./mention-field";

const MAX = 500;

export function ReplyBox({
  postId,
  seed,
  avatarSrc = null,
  placeholder = "Post your reply",
  onDone,
}: {
  postId: string;
  seed: string;
  avatarSrc?: string | null;
  placeholder?: string;
  /** Fired after a successful post — a nested box uses it to collapse itself. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(f: File) {
    const invalid = validateImageFile(f);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setImage(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
  }
  // Optimistic echo: the reply text shows immediately (faded) under the composer
  // and clears when router.refresh brings the real thread in — so posting feels
  // instant. ponytail: the stub lives in the composer, not inline in the thread,
  // because the thread renders async server PostCards that can't mount here; lift
  // into a client thread wrapper if inline placement matters.
  const [optimistic, addReply] = useOptimistic<string[], string>([], (s, text) => [...s, text]);
  // An image-only reply is valid, so "empty" needs both to be missing.
  const empty = body.trim().length === 0 && !image;

  function submit() {
    // `pending` guard blocks the double-fire from Enter + click or a rapid
    // double-tap, so the same reply can't be posted twice.
    if (empty || pending) return;
    const text = body;
    const img = image;
    setBody(""); // clear instantly; restored below if the post fails
    clearImage();
    start(async () => {
      if (text.trim()) addReply(text);
      const r = await createReply(postId, text, img ? [img] : []);
      if ("error" in r) {
        setBody(text);
        if (img) {
          setImage(img);
          setPreview(URL.createObjectURL(img));
        }
        setError(r.error);
        toast({ title: "Reply didn't post", description: r.error, variant: "danger" });
      } else {
        setError(null);
        onDone?.();
        // Single-post route: refetch just this thread to swap the optimistic echo
        // for the real reply and bump the parent's comment count. Cheap — one
        // post, not the feed.
        router.refresh();
      }
    });
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <CommunityAvatar seed={seed} src={avatarSrc} size={36} />
        {/* Pill wraps input + button so the whole row reads as one control;
            focus-within lifts the border to brand like the composer. */}
        <div className="flex flex-1 items-center gap-2 rounded-btn border border-border bg-muted/40 py-1 pl-4 pr-1.5 transition-ui focus-within:border-brand">
          {/* flex-1 wrapper so the mention listbox anchors to the input, not the
              whole pill. Enter submits only when the mention list is closed —
              the field swallows Enter while suggesting. */}
          <div className="min-w-0 flex-1">
            <MentionField
              as="input"
              value={body}
              onChange={setBody}
              onEnterSubmit={submit}
              placeholder={placeholder}
              maxLength={MAX}
              aria-label={placeholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Add image"
            title="Add image"
            className="rounded-btn p-1.5 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
          >
            <ImagePlus className="size-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={[...ALLOWED_IMAGE_TYPES].join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickImage(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            className="rounded-btn"
            loading={pending}
            disabled={empty || pending}
            onClick={submit}
          >
            Reply
          </Button>
        </div>
      </div>

      {preview && (
        <div className="relative mt-3 ml-[48px] w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-48 rounded-card border border-border" />
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove image"
            className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow-sm transition-ui hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {optimistic.map((text, i) => (
        <div key={i} className="mt-3 flex gap-3 opacity-60">
          <CommunityAvatar seed={seed} src={avatarSrc} size={36} />
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm">{text}</p>
        </div>
      ))}
      {error && <p className="mt-2 pl-[48px] text-sm text-danger">{error}</p>}
    </div>
  );
}

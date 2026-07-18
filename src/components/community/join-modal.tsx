"use client";

import { useActionState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MailCheck, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { joinFromCommunity, type JoinState } from "@/lib/auth/actions";
import { orderedProviders } from "@/lib/auth/mail-providers";

const FIELD =
  "w-full rounded-btn border border-border bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand";

/**
 * Join prompt for a logged-out visitor who tried to engage.
 *
 * The old behaviour put "Sign in first." under the button and stopped there — a
 * dead end that asked someone to go find the login page and come back. This
 * takes the account there and then, and never navigates away from the post.
 *
 * On success it does NOT sign them in: the address is unconfirmed until they
 * click the emailed link, so the modal switches to "check your email" with a
 * shortcut to the right mailbox instead of pretending they're in.
 */
export function JoinModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState<JoinState, FormData>(
    joinFromCommunity,
    undefined,
  );
  const done = state && "ok" in state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="size-5 text-brand" />
                Confirm your email
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Sent a link to <span className="font-medium text-foreground">{state.email}</span>.
              Click it and you&apos;re in — you&apos;ll land back on this post.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {orderedProviders(state.email).map((p) => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm transition-ui hover:bg-accent"
                >
                  {p.label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Nothing there? Check spam — it sends within a minute.
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join the conversation</DialogTitle>
            </DialogHeader>
            <p className="-mt-1 text-sm text-muted-foreground">
              Free account. Takes a minute, and you keep your likes, replies and bookmarks.
            </p>

            <form action={action} className="space-y-3">
              {/* Confirming the email returns them to the post they were reading. */}
              <input type="hidden" name="next" value={pathname} />
              <div>
                <label htmlFor="join-name" className="mb-1 block text-xs font-medium">
                  Name
                </label>
                <input id="join-name" name="name" autoComplete="name" className={FIELD} />
              </div>
              <div>
                <label htmlFor="join-email" className="mb-1 block text-xs font-medium">
                  Email
                </label>
                <input
                  id="join-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="join-password" className="mb-1 block text-xs font-medium">
                  Password
                </label>
                <input
                  id="join-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={FIELD}
                />
              </div>

              {state && "error" in state && (
                <p className="text-xs text-danger" role="alert">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85 disabled:opacity-50"
              >
                {pending ? "Creating your account…" : "Create account"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Already have one?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="text-brand hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

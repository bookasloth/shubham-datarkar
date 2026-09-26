"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signInWithLinkedIn } from "@/lib/auth/actions";

/** LinkedIn "in" glyph — lucide-react has no LinkedIn icon in this version. */
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/** Submit button, split out so useFormStatus can read the parent form's pending state. */
function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" loading={pending} className="w-full">
      {!pending && <LinkedInIcon />}
      Continue with LinkedIn
    </Button>
  );
}

/** OAuth sign-in via LinkedIn. Posts to a server action that redirects to the provider. */
export function LinkedInButton({ next = "" }: { next?: string }) {
  return (
    <form action={signInWithLinkedIn}>
      <input type="hidden" name="next" value={next} />
      <Submit />
    </form>
  );
}

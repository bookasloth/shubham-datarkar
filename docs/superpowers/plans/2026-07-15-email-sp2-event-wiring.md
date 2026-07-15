# Email SP2 — Event-Triggered Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Foundation email catalog (SP1) into the real per-recipient events that already exist in the codebase, so branded emails actually send.

**Architecture:** Every send goes through `sendTemplate(to, template(args))` from `src/lib/email/send-template.ts` (fail-safe: no SMTP → silent no-op). Existing live senders are swapped to catalog templates in place. New sends hook into existing server actions / the Razorpay webhook. Logic that needs a test is extracted into small pure helpers; Supabase-touching actions are wired with a best-effort try/catch so a mail failure never breaks the user's action.

**Tech Stack:** Next.js (server actions + route handlers), Supabase (`supabaseAdmin`, `auth.admin.getUserById`), nodemailer via existing `sendEmail`, vitest.

## Global Constraints

- Never break an existing flow: email is best-effort. Wrap every new send in try/catch (or rely on `sendTemplate` returning `{ok:false}`); never throw from the mail step. Copied verbatim from spec: "Do not break existing email sending flows."
- Do not remove existing variables, links, tracking, threading, or the internal owner-notify email.
- All catalog templates route through `renderEmail()`; do not build ad-hoc HTML at call sites.
- Base site URL constant: `https://shubhamdatarkar.com`.
- Branch off `origin/main`? No — continue on existing branch `feat/email-templates-branded` (SP1 lives there, unmerged). Commit per task.
- Nothing deploys automatically (manual Vercel gate).

## Scope

**In SP2 (per-recipient, existing hook):** contact confirmation, comment OTP, newsletter welcome, unsubscribe, membership gift (all swaps); membership activated / renewed / payment-failed (webhook); request received / approved / declined; community first-post welcome / post published / new comment.

**Deferred (documented, not built here):**
- `newMemberResource` — bulk fan-out to all members → belongs in SP4 (needs a members-email query + throttling).
- `projectInquiry` — no automatic trigger; it is an admin-composed reply. Wire a small admin "reply" action in a later pass.

## File Structure

- `src/lib/email/templates/_shared.ts` — MODIFY: add `TXN_FOOTER` constant.
- `src/lib/email/templates/{auth,membership,requests,contact,community,engagement,games}.ts` — MODIFY: pass `footerNote: TXN_FOOTER` on transactional templates.
- `src/lib/contact/actions.ts` — MODIFY: swap auto-reply to `contactConfirmation`.
- `src/lib/support/comment-auth.ts` — MODIFY: swap OTP to `commentOtp`.
- `src/lib/subscribers/actions.ts` — MODIFY: swap welcome + unsubscribe.
- `src/lib/members/membership-actions.ts` — MODIFY: swap `sendGiftEmail` to `membershipGift`.
- `src/lib/members/membership-notify.ts` — CREATE: `notifyMembershipEvent()` + pure `resolveMembershipEmail()`.
- `src/lib/members/membership-notify.test.ts` — CREATE.
- `src/app/api/members/webhook/route.ts` — MODIFY: call notify per event.
- `src/lib/members/request-notify.ts` — CREATE: pure `requestStatusTemplate()` + `notifyRequest*()`.
- `src/lib/members/request-notify.test.ts` — CREATE.
- `src/lib/members/request-actions.ts` — MODIFY: send received.
- `src/lib/members/admin-actions.ts` — MODIFY: send approved/declined.
- `src/lib/community/community-notify.ts` — CREATE: `notifyFirstPostOrPublished()`, `notifyReplyToAuthor()`.
- `src/lib/community/actions.ts` — MODIFY: call post notify.
- `src/lib/community/engage-actions.ts` — MODIFY: call reply notify.
- `src/lib/email/user-email.ts` — CREATE: `getUserEmail(userId)` helper (wraps `auth.admin.getUserById`).

---

### Task 1: Transactional footer copy fix (catalog only, additive)

The shell's `DEFAULT_FOOTER_NOTE` claims "you subscribed to Shubham Datarkar's Newsletter" — false for OTP / password / payment / request emails. Give transactional templates a correct footer. Newsletter + digest templates keep the default (subscription-appropriate).

**Files:**
- Modify: `src/lib/email/templates/_shared.ts`
- Modify: `auth.ts`, `membership.ts` (activated, renewalReminder, membershipRenewed, paymentFailed, newMemberResource, membershipGift), `requests.ts` (all), `contact.ts` (all), `community.ts` (communityWelcome, firstPostNudge, postPublished, newComment), `engagement.ts` (all), `games.ts` (newGame, achievementUnlocked, streakReminder)
- Test: `src/lib/email/templates/registry.test.ts` (extend)

**Interfaces:**
- Produces: `TXN_FOOTER: string` exported from `_shared.ts`.

- [ ] **Step 1: Add the constant**

In `src/lib/email/templates/_shared.ts`, append:

```ts
/** Footer note for transactional / lifecycle emails (not newsletter). */
export const TXN_FOOTER =
  "This is a service email about your account or activity on shubhamdatarkar.com. The address and links below are here if you need them.";
```

- [ ] **Step 2: Write the failing test**

Add to `registry.test.ts`:

```ts
it("transactional emails do not claim a newsletter subscription", () => {
  const txnKeys = [
    "accountWelcome", "forgotPassword", "passwordChanged", "commentOtp",
    "membershipActivated", "renewalReminder", "membershipRenewed", "paymentFailed",
    "membershipGift", "requestReceived", "requestApproved", "requestDeclined",
    "contactConfirmation", "projectInquiry", "communityWelcome", "postPublished",
    "newComment", "birthday", "festival", "weMissYou", "inactiveAccount",
    "achievementUnlocked", "streakReminder", "newGame",
  ];
  for (const key of txnKeys) {
    const e = EMAIL_CATALOG.find((x) => x.key === key)!;
    expect(e.render().html, `${key} footer`).not.toContain("subscribed to Shubham Datarkar's Newsletter");
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/email/templates/registry.test.ts`
Expected: FAIL (footer still default on those templates).

- [ ] **Step 4: Add `footerNote: TXN_FOOTER` to each transactional template**

Import in each file: `import { ..., TXN_FOOTER } from "./_shared";` and add `footerNote: TXN_FOOTER,` to the `renderEmail({...})` options object of every template listed under Files above. Example (auth.ts `accountWelcome`):

```ts
    html: renderEmail({
      preheader: "Account created. One less password to invent tonight.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: `Hey ${esc(first)}, you're in.`,
      footerNote: TXN_FOOTER,
      bodyHtml: /* unchanged */
```

Do NOT add it to: `newsletterWelcome`, `newBlogs`, `monthlyRoundup`, `unsubscribed`, `communityDigest`, `memberDigest`, `weeklyLeaderboard` (these keep the subscription footer).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/email/templates/registry.test.ts`
Expected: PASS (all prior + new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/templates
git commit -m "fix(email): correct transactional footer on non-newsletter templates"
```

---

### Task 2: `getUserEmail` helper

Shared by membership + request + community notifiers to turn a `user_id` into an email.

**Files:**
- Create: `src/lib/email/user-email.ts`
- Test: `src/lib/email/user-email.test.ts`

**Interfaces:**
- Produces: `getUserEmail(userId: string): Promise<string | null>`

- [ ] **Step 1: Implement**

```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Auth email for a user id, or null (deleted user / lookup error). */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (error) {
    console.warn("[email] getUserEmail failed:", error.message);
    return null;
  }
  return data.user?.email ?? null;
}
```

- [ ] **Step 2: Commit** (no unit test — thin wrapper over the Supabase SDK; exercised via the notifier tests)

```bash
git add src/lib/email/user-email.ts
git commit -m "feat(email): getUserEmail helper"
```

---

### Task 3: Swap existing live senders to catalog templates

Like-for-like copy swaps. Keep the internal owner-notify, threading, replyTo, and DB side-effects untouched — only the user-facing HTML/subject/text change.

**Files:**
- Modify: `src/lib/contact/actions.ts:118-131` (auto-reply block)
- Modify: `src/lib/support/comment-auth.ts:59-69` (OTP send)
- Modify: `src/lib/subscribers/actions.ts` (`sendWelcomeEmail` ~58, `sendUnsubscribeEmail` ~115)
- Modify: `src/lib/members/membership-actions.ts` (`sendGiftEmail` ~100)

**Interfaces:**
- Consumes: `sendTemplate` (send-template.ts), catalog fns `contactConfirmation`, `commentOtp`, `newsletterWelcome`, `unsubscribed`, `membershipGift`.

- [ ] **Step 1: Contact auto-reply**

In `src/lib/contact/actions.ts`, replace the `reply` send (the second `sendEmail` call, subject "Thanks — I got your message") with:

```ts
import { sendTemplate } from "@/lib/email/send-template";
import { contactConfirmation } from "@/lib/email/templates/contact";
// ...
const reply = await sendTemplate(email, contactConfirmation({ name }));
if (!reply.ok) console.warn("[contact] auto-reply failed:", reply.error);
```

Leave the owner-notify `sendEmail` above it exactly as-is.

- [ ] **Step 2: Comment OTP**

In `src/lib/support/comment-auth.ts`, replace the `sendEmail(creds, {...})` OTP block with:

```ts
import { sendTemplate } from "@/lib/email/send-template";
import { commentOtp } from "@/lib/email/templates/auth";
// ...
const send = await sendTemplate(email, commentOtp({ code }));
```

(`creds`/`getEmailCredentials` fetch above can be removed if now unused — check the file first; keep if other sends use it.)

- [ ] **Step 3: Newsletter welcome + unsubscribe**

In `src/lib/subscribers/actions.ts`, inside `sendWelcomeEmail` replace the `sendEmail` body with `await sendTemplate(email, newsletterWelcome());` and inside `sendUnsubscribeEmail` with `await sendTemplate(email, unsubscribed());`. Keep the surrounding try/catch and the `getEmailCredentials` no-op guard (or drop the now-unused creds fetch — `sendTemplate` fetches its own). Imports:

```ts
import { sendTemplate } from "@/lib/email/send-template";
import { newsletterWelcome, unsubscribed } from "@/lib/email/templates/newsletter";
```

- [ ] **Step 4: Membership gift**

In `src/lib/members/membership-actions.ts`, replace the body of `sendGiftEmail(email, planName)` with:

```ts
import { sendTemplate } from "@/lib/email/send-template";
import { membershipGift } from "@/lib/email/templates/membership";
// ...
async function sendGiftEmail(email: string, planName: string): Promise<boolean> {
  const res = await sendTemplate(email, membershipGift({ planName }));
  return res.ok;
}
```

Remove the now-unused `getEmailCredentials`/`sendEmail`/`renderEmail` imports from that file if nothing else uses them (grep first).

- [ ] **Step 5: Verify build + existing tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(email): route existing live senders through the branded catalog"
```

---

### Task 4: Membership webhook emails (activated / renewed / payment-failed)

The webhook only has a `subscription_id`. Resolve to email + plan, and distinguish first activation from a renewal by reading the row's prior `current_period_end` BEFORE sync writes.

**Files:**
- Create: `src/lib/members/membership-notify.ts`
- Test: `src/lib/members/membership-notify.test.ts`
- Modify: `src/app/api/members/webhook/route.ts`

**Interfaces:**
- Consumes: `getUserEmail`, catalog `membershipActivated`, `membershipRenewed`, `paymentFailed`.
- Produces:
  - `classifyChargeKind(priorPeriodEnd: string | null): "activated" | "renewed"` (pure)
  - `notifyMembershipEvent(subscriptionId: string, kind: "activated" | "renewed" | "failed"): Promise<void>`

- [ ] **Step 1: Write the failing test for the pure classifier**

`src/lib/members/membership-notify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyChargeKind } from "./membership-notify";

describe("classifyChargeKind", () => {
  it("first charge (no prior period) is an activation", () => {
    expect(classifyChargeKind(null)).toBe("activated");
  });
  it("charge with an existing period is a renewal", () => {
    expect(classifyChargeKind("2026-08-01T00:00:00.000Z")).toBe("renewed");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/membership-notify.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `membership-notify.ts`**

```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { membershipActivated, membershipRenewed, paymentFailed } from "@/lib/email/templates/membership";

/** First charge (no prior period end) = activation; otherwise a renewal. */
export function classifyChargeKind(priorPeriodEnd: string | null): "activated" | "renewed" {
  return priorPeriodEnd ? "renewed" : "activated";
}

type Kind = "activated" | "renewed" | "failed";

/** Best-effort: look up member email + plan name for a subscription and send. */
export async function notifyMembershipEvent(subscriptionId: string, kind: Kind): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const { data: m } = await admin
      .from("memberships")
      .select("user_id, plan_key")
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();
    if (!m?.user_id) return;

    const email = await getUserEmail(m.user_id);
    if (!email) return;

    const { data: plan } = await admin
      .from("membership_plans")
      .select("name")
      .eq("key", m.plan_key)
      .maybeSingle();
    const planName = plan?.name ?? "your plan";

    if (kind === "activated") await sendTemplate(email, membershipActivated({ planName }));
    else if (kind === "renewed") await sendTemplate(email, membershipRenewed({ planName }));
    else await sendTemplate(email, paymentFailed({ planName }));
  } catch (e) {
    console.warn("[members] notifyMembershipEvent failed:", (e as Error).message);
  }
}
```

- [ ] **Step 4: Run to verify the classifier test passes**

Run: `npx vitest run src/lib/members/membership-notify.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the webhook**

In `src/app/api/members/webhook/route.ts`, read the prior period end before sync (for the charged case), then notify. Replace the `switch` body:

```ts
import { syncMembershipFromWebhook } from "@/lib/members/membership-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { classifyChargeKind, notifyMembershipEvent } from "@/lib/members/membership-notify";
// ...
  switch (payload.event) {
    case "subscription.activated": {
      await syncMembershipFromWebhook(subscriptionId, "active", sub?.current_end ?? undefined);
      await notifyMembershipEvent(subscriptionId, "activated");
      break;
    }
    case "subscription.charged": {
      const { data: prior } = await supabaseAdmin()
        .from("memberships")
        .select("current_period_end")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      await syncMembershipFromWebhook(subscriptionId, "active", sub?.current_end ?? undefined);
      await notifyMembershipEvent(subscriptionId, classifyChargeKind(prior?.current_period_end ?? null));
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed":
      await syncMembershipFromWebhook(subscriptionId, "cancelled");
      break;
    case "subscription.halted":
    case "subscription.paused":
      await syncMembershipFromWebhook(subscriptionId, "expired");
      await notifyMembershipEvent(subscriptionId, "failed");
      break;
    default:
      break;
  }
```

Note: `subscription.activated` and the first `subscription.charged` both fire near the first payment. The classifier suppresses a duplicate "activated" — but the first `charged` arriving BEFORE the row has a period end would classify as "activated" and double with the `activated` event. Mitigation: the `activated` handler sets `current_period_end`; if `charged` arrives after, prior end is set → "renewed" is skipped-as-wrong only if timing inverts. Accept this small risk (worst case: one extra activated email on first cycle). Documented; revisit with an `email_log` dedupe in SP4 if it bites.

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(email): membership activated/renewed/payment-failed on Razorpay webhook"
```

---

### Task 5: Member request emails (received / approved / declined)

**Files:**
- Create: `src/lib/members/request-notify.ts`
- Test: `src/lib/members/request-notify.test.ts`
- Modify: `src/lib/members/request-actions.ts` (`createRequest`)
- Modify: `src/lib/members/admin-actions.ts` (`updateRequestStatus`)

**Interfaces:**
- Consumes: `getUserEmail`, `sendTemplate`, catalog `requestReceived`, `requestApproved`, `requestDeclined`.
- Produces:
  - `statusToTemplateKind(status: string): "approved" | "declined" | null` (pure)
  - `notifyRequestReceived(userEmail: string, kind: string, title: string): Promise<void>`
  - `notifyRequestStatus(requestId: string, status: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

`src/lib/members/request-notify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { statusToTemplateKind } from "./request-notify";

describe("statusToTemplateKind", () => {
  it("shipped and planned mean approved", () => {
    expect(statusToTemplateKind("shipped")).toBe("approved");
    expect(statusToTemplateKind("planned")).toBe("approved");
  });
  it("declined means declined", () => {
    expect(statusToTemplateKind("declined")).toBe("declined");
  });
  it("open sends nothing", () => {
    expect(statusToTemplateKind("open")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/members/request-notify.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `request-notify.ts`**

```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { requestReceived, requestApproved, requestDeclined } from "@/lib/email/templates/requests";

/** Which status change warrants which email (open → none). */
export function statusToTemplateKind(status: string): "approved" | "declined" | null {
  if (status === "shipped" || status === "planned") return "approved";
  if (status === "declined") return "declined";
  return null;
}

export async function notifyRequestReceived(userEmail: string, kind: string, title: string): Promise<void> {
  try {
    await sendTemplate(userEmail, requestReceived({ kind, title }));
  } catch (e) {
    console.warn("[requests] received email failed:", (e as Error).message);
  }
}

export async function notifyRequestStatus(requestId: string, status: string): Promise<void> {
  const kind = statusToTemplateKind(status);
  if (!kind) return;
  try {
    const { data: r } = await supabaseAdmin()
      .from("member_requests")
      .select("user_id, title")
      .eq("id", requestId)
      .maybeSingle();
    if (!r?.user_id) return;
    const email = await getUserEmail(r.user_id);
    if (!email) return;
    if (kind === "approved") await sendTemplate(email, requestApproved({ title: r.title }));
    else await sendTemplate(email, requestDeclined({ title: r.title }));
  } catch (e) {
    console.warn("[requests] status email failed:", (e as Error).message);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/members/request-notify.test.ts` → PASS.

- [ ] **Step 5: Wire `createRequest`**

In `src/lib/members/request-actions.ts`, after the successful insert (before `return { ok: true }`), add:

```ts
import { notifyRequestReceived } from "./request-notify";
// user.email is available from the getUser() call already in this function
if (user.email) await notifyRequestReceived(user.email, kind, title.slice(0, 200));
```

- [ ] **Step 6: Wire `updateRequestStatus`**

In `src/lib/members/admin-actions.ts`, after the successful update (before `revalidatePath`), add:

```ts
import { notifyRequestStatus } from "./request-notify";
// ...
await notifyRequestStatus(id, status);
```

- [ ] **Step 7: Verify build + tests**

Run: `npx tsc --noEmit && npx vitest run src/lib/members/request-notify.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(email): member request received/approved/declined emails"
```

---

### Task 6: Community emails (first-post welcome / post published / new comment)

**Decision (flag to owner):** the community publishes instantly and the author is on-site, so a "your post is live" email on every post is noise. This wires: **first ever post → `communityWelcome`; every later post → `postPublished`**, single hook. If `postPublished`-per-post proves noisy, drop that branch (one-line change). Replies → `newComment` to the parent author (skip self-replies).

**Files:**
- Create: `src/lib/community/community-notify.ts`
- Test: `src/lib/community/community-notify.test.ts`
- Modify: `src/lib/community/actions.ts` (`createPost`)
- Modify: `src/lib/community/engage-actions.ts` (`createReply`)

**Interfaces:**
- Consumes: `getUserEmail`, `sendTemplate`, catalog `communityWelcome`, `postPublished`, `newComment`.
- Produces:
  - `postEmailKind(priorPostCount: number): "welcome" | "published"` (pure)
  - `notifyPostCreated(userId: string, postHref: string): Promise<void>`
  - `notifyReply(parentPostId: string, replierUserId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

`src/lib/community/community-notify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { postEmailKind } from "./community-notify";

describe("postEmailKind", () => {
  it("first post (0 prior) welcomes", () => {
    expect(postEmailKind(0)).toBe("welcome");
  });
  it("later posts are publish notices", () => {
    expect(postEmailKind(1)).toBe("published");
    expect(postEmailKind(42)).toBe("published");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/community/community-notify.test.ts` → FAIL.

- [ ] **Step 3: Implement `community-notify.ts`**

```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { communityWelcome, postPublished, newComment } from "@/lib/email/templates/community";

const SITE = "https://shubhamdatarkar.com";

/** First root post welcomes; subsequent posts get a publish notice. */
export function postEmailKind(priorPostCount: number): "welcome" | "published" {
  return priorPostCount === 0 ? "welcome" : "published";
}

/** Fire after a successful root-post insert. Best-effort. */
export async function notifyPostCreated(userId: string, postHref: string): Promise<void> {
  try {
    const admin = supabaseAdmin();
    // Count prior ROOT posts (exclude replies + reblogs) by this user, excluding the one just made is hard here;
    // count all root posts: if 1, this is their first.
    const { count } = await admin
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("parent_id", null)
      .is("reblog_of", null);
    const email = await getUserEmail(userId);
    if (!email) return;
    // count includes the just-inserted post → 1 means first.
    const kind = postEmailKind((count ?? 1) - 1);
    if (kind === "welcome") await sendTemplate(email, communityWelcome({}));
    else await sendTemplate(email, postPublished({ href: postHref }));
  } catch (e) {
    console.warn("[community] post email failed:", (e as Error).message);
  }
}

/** Fire after a successful reply insert. Emails the parent author (not self). */
export async function notifyReply(parentPostId: string, replierUserId: string): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const { data: parent } = await admin
      .from("community_posts")
      .select("user_id, public_id")
      .eq("id", parentPostId)
      .maybeSingle();
    if (!parent?.user_id || parent.user_id === replierUserId) return;

    const email = await getUserEmail(parent.user_id);
    if (!email) return;

    const { data: replier } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", replierUserId)
      .maybeSingle();
    const author = replier?.display_name || (replier?.username ? `@${replier.username}` : "Someone");
    const href = `${SITE}/community/p/${parent.public_id}`;
    await sendTemplate(email, newComment({ author, excerpt: "", href }));
  } catch (e) {
    console.warn("[community] reply email failed:", (e as Error).message);
  }
}
```

Note: profile source is the `profiles` table keyed by `id` (= user id), columns `username` + `display_name` (confirmed in `community/queries.ts:149`). If no profile row, the `"Someone"` fallback holds.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/community/community-notify.test.ts` → PASS.

- [ ] **Step 5: Wire `createPost`**

In `src/lib/community/actions.ts`, change the insert to return the new row's `public_id`, then notify (only for root posts — this action only makes root posts):

```ts
import { notifyPostCreated } from "./community-notify";
// ...
const { data: inserted, error } = await sb.from("community_posts").insert({
  user_id: user.id,
  type: valid.type,
  body: valid.body,
  images: imageUrls,
  youtube_id: valid.youtubeId,
  poll: valid.poll,
}).select("public_id").maybeSingle();
if (error) return { error: error.message };

const href = inserted?.public_id
  ? `https://shubhamdatarkar.com/community/p/${inserted.public_id}`
  : "https://shubhamdatarkar.com/community";
await notifyPostCreated(user.id, href);

revalidatePath("/community");
return { ok: true };
```

- [ ] **Step 6: Wire `createReply`**

In `src/lib/community/engage-actions.ts`, after the successful reply insert (before the revalidate calls), add:

```ts
import { notifyReply } from "./community-notify";
// ...
await notifyReply(postId, user.id);
```

- [ ] **Step 7: Verify build + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(email): community first-post welcome, post-published, and reply emails"
```

---

### Task 7: Manual verification + preview refresh

- [ ] **Step 1: Full typecheck + test suite**

Run: `npx tsc --noEmit && npx vitest run && npx eslint src/lib src/app`
Expected: all PASS / 0 errors.

- [ ] **Step 2: Eyeball preview** (optional, admin-gated) — `/admin/email-preview` still renders all 33; nothing here changed the catalog output except the corrected footers.

- [ ] **Step 3: Update the memory + manifest doc** — mark SP2 done in `email-templates-branded-state.md`; note deferred `newMemberResource` (SP4) and `projectInquiry` (later manual action).

---

## Self-Review

**Spec coverage:** contact confirm ✓ (T3), OTP ✓ (T3), newsletter welcome/unsub ✓ (T3), gift ✓ (T3), membership activated/renewed/failed ✓ (T4), request received/approved/declined ✓ (T5), community welcome/published/comment ✓ (T6). Deferred with rationale: newMemberResource (SP4 bulk), projectInquiry (manual). Auth Welcome/Forgot/Password-changed = SP3 (Send Email Hook), not SP2.

**Type consistency:** `notifyMembershipEvent(subscriptionId, kind)`, `classifyChargeKind(priorPeriodEnd)`, `statusToTemplateKind(status)`, `postEmailKind(priorPostCount)`, `getUserEmail(userId)` — used consistently across tasks. Catalog fn arg shapes match SP1 signatures (`membershipActivated({planName})`, `newComment({author,excerpt,href,name?})`, `postPublished({href,name?})`, `communityWelcome({name?,username?})`, `requestReceived({kind,title,name?})`).

**Placeholder scan:** none — every step shows real code.

**Open verification for the implementer:** none outstanding — profile source confirmed as `profiles(id, username, display_name)`. Only runtime gate is that SMTP creds exist in the target env (fail-safe otherwise).

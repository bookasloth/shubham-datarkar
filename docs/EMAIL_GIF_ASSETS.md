# Email Templates — Audit + GIF Asset Manifest

Foundation of the branded-email system. All templates live in
`src/lib/email/templates/` and render through the one shell in
`src/lib/email/template.ts`. GIF URLs are centralised in
`src/lib/email/gifs.ts` (`EMAIL_GIFS`) — never hardcode a CDN path in a template.

- **CDN base:** `https://company-assets.bookasloth.in/images/sd/email`
- **New GIF directory:** `…/images/sd/email/gifs/`
- **Public URL pattern:** `https://company-assets.bookasloth.in/images/sd/email/gifs/<file>.gif`
- Two GIFs already exist at the folder **root** and are reused: `welcome.gif`,
  `unsubscribe.gif`.

---

## Part 1 — Audit: emails already sending in the codebase (pre-Foundation)

These were the live senders before this work. Foundation adds branded catalog
versions; **wiring them in is a later sub-project** (call sites unchanged here).

| Email | Trigger | Recipient | Current subject | Location | Data available | Humour |
|---|---|---|---|---|---|---|
| Contact — owner notify (internal) | Contact form submit | Owner | `New contact: {name}` | `lib/contact/actions.ts` | name, email, projectType, budget, message | None (internal) |
| Contact — auto-reply | Contact form submit | Visitor | `Thanks — I got your message` | `lib/contact/actions.ts` | name | Subtle |
| Newsletter welcome | Subscribe | Subscriber | `Welcome aboard — you're in` | `lib/subscribers/actions.ts` | email | High |
| Unsubscribe confirm | Unsubscribe | Ex-subscriber | `You've been unsubscribed` | `lib/subscribers/actions.ts` | email | Subtle |
| Comment OTP | Guest comment | Commenter | `Your comment verification code: {code}` | `lib/support/comment-auth.ts` | code | None |
| New comment notify | Comment on update | Owner | `New comment on your update #{code}` | `lib/support/comments-actions.ts` | author, body, url | Subtle |
| Comment reply notify | Reply to comment | Parent commenter | `{author} replied to your comment` | `lib/support/comments-actions.ts` | author, body, url, parent | Subtle |
| Membership gift | Admin gifts plan | Recipient | `You've been gifted {plan}` | `lib/members/membership-actions.ts` | planName | High |
| Birthday | Daily cron | Member | `Happy birthday, {first}!` | `lib/members/birthday-email.ts` | fullName | High |
| Inbox reply | Admin `/admin/inbox` | Original sender | `Re: {subject}` | `lib/email/imap-actions.ts` | body, threading | None (stays plain — human reply) |

---

## Part 2 — Full template catalog (Foundation deliverable)

33 user-facing templates. `render()` in `templates/index.ts` binds each to
sample data (preview + tests). "Wire" column = the trigger the later sub-project
connects.

| # | Category | Template (key) | Recipient | Wire | GIF key | Humour |
|---|---|---|---|---|---|---|
| 1 | Auth | Welcome / account created (`accountWelcome`) | New user | Supabase Send Email Hook | accountWelcome | High |
| 2 | Auth | Forgot password (`forgotPassword`) | User | Supabase Send Email Hook | forgotPassword | None |
| 3 | Auth | Password changed (`passwordChanged`) | User | Password-update action | passwordChanged | Subtle |
| 4 | Auth | Comment OTP (`commentOtp`) | Guest commenter | Existing comment-auth | otp | None |
| 5 | Newsletter | Builders List confirmed (`newsletterWelcome`) | Subscriber | Existing subscribe | newsletterWelcome | High |
| 6 | Newsletter | New blogs this week (`newBlogs`) | Subscribers | Cron (Mon) | newBlogs | Subtle |
| 7 | Newsletter | Monthly roundup (`monthlyRoundup`) | Subscribers | Cron (1st) | monthlyRoundup | Subtle |
| 8 | Newsletter | Unsubscribe confirm (`unsubscribed`) | Ex-subscriber | Existing unsubscribe | unsubscribe | Subtle |
| 9 | Community | Welcome to community (`communityWelcome`) | New member | First community join | communityWelcome | High |
| 10 | Community | Create first post (`firstPostNudge`) | Member, 0 posts | Cron nudge | firstPost | Subtle |
| 11 | Community | Post published (`postPublished`) | Author | Post create | postPublished | Subtle |
| 12 | Community | Someone commented (`newComment`) | Author | Comment hook | newComment | Subtle |
| 13 | Community | Weekly digest (`communityDigest`) | Members | Cron (Mon) | communityDigest | Subtle |
| 14 | Membership | Activated (`membershipActivated`) | Member | Razorpay webhook / gift | membershipActivated | High |
| 15 | Membership | Renewal reminder (`renewalReminder`) | Member | Cron | renewalReminder | Subtle |
| 16 | Membership | Renewed (`membershipRenewed`) | Member | Razorpay charged | membershipRenewed | Subtle |
| 17 | Membership | Payment failed (`paymentFailed`) | Member | Razorpay failed | paymentFailed | None |
| 18 | Membership | New member resource (`newMemberResource`) | Members | Admin publish | newResource | Subtle |
| 19 | Membership | Monthly member digest (`memberDigest`) | Members | Cron (1st) | memberDigest | Subtle |
| 20 | Membership | Gifted membership (`membershipGift`) | Recipient | Existing gift | membershipGift | High |
| 21 | Requests | Request received (`requestReceived`) | Member | createRequest | requestReceived | Subtle |
| 22 | Requests | Request approved (`requestApproved`) | Member | Admin status change | requestApproved | High |
| 23 | Requests | Request declined (`requestDeclined`) | Member | Admin status change | requestDeclined | None |
| 23b | Engagement | Introduction (`introduction`) | New user/subscriber | Cron ~24h after signup (SP4) | introduction | High |
| 24 | Engagement | We miss you (`weMissYou`) | Dormant user | Cron | weMissYou | Subtle |
| 25 | Engagement | Inactive account (`inactiveAccount`) | Never-activated | Cron | inactiveAccount | Subtle |
| 26 | Engagement | Birthday (`birthday`) | User (birthday) | Daily cron | birthday | High |
| 27 | Engagement | Festival greeting (`festival`) | All users | Cron (festival calendar) | festival | Subtle |
| 28 | Contact | Contact confirmation (`contactConfirmation`) | Visitor | Contact submit | contactConfirmation | Subtle |
| 29 | Contact | Project inquiry response (`projectInquiry`) | Prospect | Admin reply | projectInquiry | Subtle |
| 30 | Games | New game released (`newGame`) | Players | Admin adds game | newGame | High |
| 31 | Games | Weekly leaderboard (`weeklyLeaderboard`) | Players | Cron (Mon) | weeklyLeaderboard | Subtle |
| 32 | Games | Achievement unlocked (`achievementUnlocked`) | Player | Result submit | achievementUnlocked | High |
| 33 | Games | Streak reminder (`streakReminder`) | Player | Daily cron | streakReminder | Subtle |

---

## Part 3 — GIF asset manifest

One GIF per email. Filenames map 1:1 to `EMAIL_GIFS` keys in
`src/lib/email/gifs.ts`. Keep them light (≤ ~500 KB), roughly 2:1 landscape,
loop cleanly.

| Email | GIF Key | Required Filename | CDN Path | Recommended Scene |
|---|---|---|---|---|
| Welcome / account created | accountWelcome | welcome.gif *(exists)* | /images/sd/email/welcome.gif | Friendly wave / hello |
| Forgot password | forgotPassword | password-reset.gif | /images/sd/email/gifs/password-reset.gif | A key turning in a lock |
| Password changed | passwordChanged | password-changed.gif | /images/sd/email/gifs/password-changed.gif | A padlock clicking shut |
| Comment OTP | otp | otp.gif | /images/sd/email/gifs/otp.gif | A code being typed in / secret |
| Builders List confirmed | newsletterWelcome | newsletter-welcome.gif | /images/sd/email/gifs/newsletter-welcome.gif | Mailbox flag popping up |
| New blogs this week | newBlogs | new-blogs.gif | /images/sd/email/gifs/new-blogs.gif | A stack of fresh articles |
| Monthly roundup | monthlyRoundup | monthly-roundup.gif | /images/sd/email/gifs/monthly-roundup.gif | Calendar month flipping / wrap-up |
| Unsubscribe confirm | unsubscribe | unsubscribe.gif *(exists)* | /images/sd/email/unsubscribe.gif | Friendly goodbye wave |
| Welcome to community | communityWelcome | community-welcome.gif | /images/sd/email/gifs/community-welcome.gif | A crowd waving hello |
| Create first post | firstPost | first-post.gif | /images/sd/email/gifs/first-post.gif | Blank page, blinking cursor |
| Post published | postPublished | post-published.gif | /images/sd/email/gifs/post-published.gif | Small confetti burst |
| Someone commented | newComment | new-comment.gif | /images/sd/email/gifs/new-comment.gif | A speech bubble popping up |
| Weekly community digest | communityDigest | community-digest.gif | /images/sd/email/gifs/community-digest.gif | A lively, buzzing feed |
| Membership activated | membershipActivated | membership-activated.gif | /images/sd/email/gifs/membership-activated.gif | A member badge lighting up |
| Renewal reminder | renewalReminder | renewal-reminder.gif | /images/sd/email/gifs/renewal-reminder.gif | Calendar page + gentle clock |
| Renewed | membershipRenewed | membership-renewed.gif | /images/sd/email/gifs/membership-renewed.gif | A checkmark landing softly |
| Payment failed | paymentFailed | payment-failed.gif | /images/sd/email/gifs/payment-failed.gif | Card + subtle retry prompt (calm) |
| New member resource | newResource | new-resource.gif | /images/sd/email/gifs/new-resource.gif | A gift being unwrapped |
| Monthly member digest | memberDigest | member-digest.gif | /images/sd/email/gifs/member-digest.gif | A shelf of resources filling up |
| Gifted membership | membershipGift | membership-gift.gif | /images/sd/email/gifs/membership-gift.gif | A wrapped gift with a bow |
| Request received | requestReceived | request-received.gif | /images/sd/email/gifs/request-received.gif | A note dropping into an inbox tray |
| Request approved | requestApproved | request-approved.gif | /images/sd/email/gifs/request-approved.gif | A green light switching on |
| Request declined | requestDeclined | request-declined.gif | /images/sd/email/gifs/request-declined.gif | A respectful, gentle nod |
| Introduction (24h after signup) | introduction | introduction.gif | /images/sd/email/gifs/introduction.gif | A friendly hello, hand extended |
| We miss you | weMissYou | we-miss-you.gif | /images/sd/email/gifs/we-miss-you.gif | A chair waiting by an open door |
| Inactive account | inactiveAccount | finish-setup.gif | /images/sd/email/gifs/finish-setup.gif | A checklist with one box left |
| Birthday | birthday | birthday.gif | /images/sd/email/gifs/birthday.gif | A little cake with a candle |
| Festival greeting | festival | festival.gif | /images/sd/email/gifs/festival.gif | Warm celebration lights (generic) |
| Contact confirmation | contactConfirmation | contact-received.gif | /images/sd/email/gifs/contact-received.gif | A message arriving with a soft ping |
| Project inquiry response | projectInquiry | project-inquiry.gif | /images/sd/email/gifs/project-inquiry.gif | Two hands meeting in a handshake |
| New game released | newGame | new-game.gif | /images/sd/email/gifs/new-game.gif | A game controller powering up |
| Weekly leaderboard | weeklyLeaderboard | weekly-leaderboard.gif | /images/sd/email/gifs/weekly-leaderboard.gif | A trophy on a winner's podium |
| Achievement unlocked | achievementUnlocked | achievement-unlocked.gif | /images/sd/email/gifs/achievement-unlocked.gif | A badge unlocking with a shine |
| Streak reminder | streakReminder | streak-reminder.gif | /images/sd/email/gifs/streak-reminder.gif | A small flame flickering |

**Fallback:** the email shell uses meaningful `alt` text on every GIF, so if a
client blocks images the reader still gets the context. (Animated GIFs can't use
a `<picture>` static fallback reliably across clients; alt text is the fallback.)

**Preview:** admins can eyeball all 33 at `/admin/email-preview`.

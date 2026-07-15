/**
 * Central GIF registry for emails. One key per user-facing email; the URL is the
 * single source of truth so templates never hardcode a CDN path.
 *
 * CDN base matches the existing brand assets in `template.ts` (EMAIL_BRAND logos
 * live under the same `/images/sd/email` folder). Two GIFs already exist at the
 * folder root (welcome.gif, unsubscribe.gif) — reused here; everything new lives
 * under `/gifs/` so uploads are one tidy directory.
 *
 * Pure constants — no secrets, no server-only deps (safe to import anywhere,
 * including the admin preview page).
 */

export const EMAIL_CDN = "https://company-assets.bookasloth.in/images/sd/email";
const G = `${EMAIL_CDN}/gifs`;

export const EMAIL_GIFS = {
  // Auth
  accountWelcome: `${EMAIL_CDN}/welcome.gif`, // reuse existing
  forgotPassword: `${G}/password-reset.gif`,
  passwordChanged: `${G}/password-changed.gif`,
  otp: `${G}/otp.gif`,

  // Newsletter
  newsletterWelcome: `${G}/newsletter-welcome.gif`,
  newBlogs: `${G}/new-blogs.gif`,
  monthlyRoundup: `${G}/monthly-roundup.gif`,
  unsubscribe: `${EMAIL_CDN}/unsubscribe.gif`, // reuse existing

  // Community
  communityWelcome: `${G}/community-welcome.gif`,
  firstPost: `${G}/first-post.gif`,
  postPublished: `${G}/post-published.gif`,
  newComment: `${G}/new-comment.gif`,
  communityDigest: `${G}/community-digest.gif`,

  // Membership
  membershipActivated: `${G}/membership-activated.gif`,
  renewalReminder: `${G}/renewal-reminder.gif`,
  membershipRenewed: `${G}/membership-renewed.gif`,
  paymentFailed: `${G}/payment-failed.gif`,
  newResource: `${G}/new-resource.gif`,
  memberDigest: `${G}/member-digest.gif`,
  membershipGift: `${G}/membership-gift.gif`,

  // Requests
  requestReceived: `${G}/request-received.gif`,
  requestApproved: `${G}/request-approved.gif`,
  requestDeclined: `${G}/request-declined.gif`,

  // Engagement
  introduction: `${G}/introduction.gif`,
  weMissYou: `${G}/we-miss-you.gif`,
  inactiveAccount: `${G}/finish-setup.gif`,
  birthday: `${G}/birthday.gif`,
  festival: `${G}/festival.gif`,

  // Contact
  contactConfirmation: `${G}/contact-received.gif`,
  projectInquiry: `${G}/project-inquiry.gif`,

  // Games
  newGame: `${G}/new-game.gif`,
  weeklyLeaderboard: `${G}/weekly-leaderboard.gif`,
  achievementUnlocked: `${G}/achievement-unlocked.gif`,
  streakReminder: `${G}/streak-reminder.gif`,
} as const;

export type EmailGifKey = keyof typeof EMAIL_GIFS;

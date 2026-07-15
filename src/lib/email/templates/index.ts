/**
 * The email template catalog. Every user-facing email lives here as a pure
 * function; this registry binds each to sample data so the /admin/email-preview
 * page and the GIF manifest share one source of truth.
 *
 * `render` returns a RenderedEmail with realistic sample values. Wiring code
 * (later sub-projects) imports the template functions directly with real data
 * and sends via `sendTemplate`.
 */

import type { RenderedEmail } from "./_shared";
import type { EmailGifKey } from "../gifs";

import * as auth from "./auth";
import * as newsletter from "./newsletter";
import * as community from "./community";
import * as membership from "./membership";
import * as requests from "./requests";
import * as engagement from "./engagement";
import * as contact from "./contact";
import * as games from "./games";

const SITE = "https://shubhamdatarkar.com";
const NAME = "Aarav Sharma";

export type HumourLevel = "High" | "Subtle" | "None";

export type EmailCategory =
  | "Authentication"
  | "Newsletter"
  | "Community"
  | "Membership"
  | "Requests"
  | "Engagement"
  | "Contact"
  | "Games";

export type CatalogEntry = {
  key: string;
  category: EmailCategory;
  label: string;
  /** Who receives it. */
  recipient: string;
  /** What fires it. */
  trigger: string;
  humour: HumourLevel;
  gifKey: EmailGifKey;
  /** Render with realistic sample data (for preview + tests). */
  render: () => RenderedEmail;
};

const samplePosts = [
  { title: "The AEO wedge: how to get cited by AI", href: `${SITE}/blog/aeo-wedge`, meta: "8 min read" },
  { title: "What actually moved the needle in Q2", href: `${SITE}/blog/q2-retro`, meta: "5 min read" },
  { title: "Cold email teardown: 3 that worked", href: `${SITE}/blog/cold-email-teardown`, meta: "6 min read" },
];

export const EMAIL_CATALOG: CatalogEntry[] = [
  // Authentication
  { key: "accountWelcome", category: "Authentication", label: "Welcome / Account created", recipient: "New user", trigger: "Signup confirmed (Supabase hook)", humour: "High", gifKey: "accountWelcome", render: () => auth.accountWelcome({ name: NAME }) },
  { key: "forgotPassword", category: "Authentication", label: "Forgot password", recipient: "User", trigger: "Password recovery (Supabase hook)", humour: "None", gifKey: "forgotPassword", render: () => auth.forgotPassword({ name: NAME, resetUrl: `${SITE}/reset-password?token=sample` }) },
  { key: "passwordChanged", category: "Authentication", label: "Password changed", recipient: "User", trigger: "Password updated", humour: "Subtle", gifKey: "passwordChanged", render: () => auth.passwordChanged({ name: NAME }) },
  { key: "commentOtp", category: "Authentication", label: "Comment verification code", recipient: "Guest commenter", trigger: "Guest requests a comment OTP", humour: "None", gifKey: "otp", render: () => auth.commentOtp({ code: "482913" }) },

  // Newsletter
  { key: "newsletterWelcome", category: "Newsletter", label: "Builders List confirmed", recipient: "New subscriber", trigger: "Newsletter subscribe", humour: "High", gifKey: "newsletterWelcome", render: () => newsletter.newsletterWelcome() },
  { key: "newBlogs", category: "Newsletter", label: "New blogs this week", recipient: "Subscribers", trigger: "Weekly cron (Mon)", humour: "Subtle", gifKey: "newBlogs", render: () => newsletter.newBlogs({ posts: samplePosts }) },
  { key: "monthlyRoundup", category: "Newsletter", label: "Monthly roundup", recipient: "Subscribers", trigger: "Monthly cron (1st)", humour: "Subtle", gifKey: "monthlyRoundup", render: () => newsletter.monthlyRoundup({ monthLabel: "June", posts: samplePosts }) },
  { key: "unsubscribed", category: "Newsletter", label: "Unsubscribe confirmation", recipient: "Ex-subscriber", trigger: "Unsubscribe", humour: "Subtle", gifKey: "unsubscribe", render: () => newsletter.unsubscribed() },

  // Community
  { key: "communityWelcome", category: "Community", label: "Welcome to community", recipient: "New community member", trigger: "First community join", humour: "High", gifKey: "communityWelcome", render: () => community.communityWelcome({ name: NAME, username: "aarav" }) },
  { key: "firstPostNudge", category: "Community", label: "Create your first post", recipient: "Member with 0 posts", trigger: "Cron (joined ≥3d, 0 posts)", humour: "Subtle", gifKey: "firstPost", render: () => community.firstPostNudge({ name: NAME }) },
  { key: "postPublished", category: "Community", label: "Your post is published", recipient: "Post author", trigger: "Post created", humour: "Subtle", gifKey: "postPublished", render: () => community.postPublished({ name: NAME, href: `${SITE}/community/p/2026-1` }) },
  { key: "newComment", category: "Community", label: "Someone commented", recipient: "Post author", trigger: "New comment on post", humour: "Subtle", gifKey: "newComment", render: () => community.newComment({ name: NAME, author: "Meera Iyer", excerpt: "This is exactly the framing I needed — the AEO wedge point especially.", href: `${SITE}/community/p/2026-1` }) },
  { key: "communityDigest", category: "Community", label: "Weekly community digest", recipient: "Community members", trigger: "Weekly cron (Mon)", humour: "Subtle", gifKey: "communityDigest", render: () => community.communityDigest({ items: samplePosts }) },

  // Membership
  { key: "membershipActivated", category: "Membership", label: "Membership activated", recipient: "New member", trigger: "Razorpay activated / gift", humour: "High", gifKey: "membershipActivated", render: () => membership.membershipActivated({ name: NAME, planName: "Annual" }) },
  { key: "renewalReminder", category: "Membership", label: "Renewal reminder", recipient: "Member", trigger: "Cron (renewal in N days)", humour: "Subtle", gifKey: "renewalReminder", render: () => membership.renewalReminder({ name: NAME, planName: "Annual", renewsOn: "12 August 2026", amount: "₹999" }) },
  { key: "membershipRenewed", category: "Membership", label: "Renewed successfully", recipient: "Member", trigger: "Razorpay charged", humour: "Subtle", gifKey: "membershipRenewed", render: () => membership.membershipRenewed({ name: NAME, planName: "Annual", nextRenewal: "12 August 2027", amount: "₹999" }) },
  { key: "paymentFailed", category: "Membership", label: "Payment failed", recipient: "Member", trigger: "Razorpay payment failed", humour: "None", gifKey: "paymentFailed", render: () => membership.paymentFailed({ name: NAME, planName: "Annual", retryUrl: `${SITE}/members/account` }) },
  { key: "newMemberResource", category: "Membership", label: "New members-only resource", recipient: "Members", trigger: "Admin publishes member resource", humour: "Subtle", gifKey: "newResource", render: () => membership.newMemberResource({ name: NAME, title: "The AEO Audit Template", href: `${SITE}/members`, kind: "template" }) },
  { key: "memberDigest", category: "Membership", label: "Monthly member digest", recipient: "Members", trigger: "Monthly cron (1st)", humour: "Subtle", gifKey: "memberDigest", render: () => membership.memberDigest({ monthLabel: "June", items: samplePosts }) },
  { key: "membershipGift", category: "Membership", label: "Gifted membership", recipient: "Gift recipient", trigger: "Admin gifts a plan", humour: "High", gifKey: "membershipGift", render: () => membership.membershipGift({ planName: "Lifetime" }) },

  // Requests
  { key: "requestReceived", category: "Requests", label: "Request received", recipient: "Member", trigger: "Member submits a request", humour: "Subtle", gifKey: "requestReceived", render: () => requests.requestReceived({ name: NAME, kind: "template", title: "Cold email teardown template" }) },
  { key: "requestApproved", category: "Requests", label: "Request approved", recipient: "Member", trigger: "Admin approves request", humour: "High", gifKey: "requestApproved", render: () => requests.requestApproved({ name: NAME, title: "Cold email teardown template", note: "Live in the members library now — search 'cold email'.", href: `${SITE}/members` }) },
  { key: "requestDeclined", category: "Requests", label: "Request declined", recipient: "Member", trigger: "Admin declines request", humour: "None", gifKey: "requestDeclined", render: () => requests.requestDeclined({ name: NAME, title: "Cold email teardown template", reason: "It overlaps heavily with the outreach guide already in the library." }) },

  // Engagement
  { key: "weMissYou", category: "Engagement", label: "We miss you", recipient: "Dormant user", trigger: "Cron (no sign-in ~30d)", humour: "Subtle", gifKey: "weMissYou", render: () => engagement.weMissYou({ name: NAME }) },
  { key: "inactiveAccount", category: "Engagement", label: "Inactive account reminder", recipient: "Never-activated user", trigger: "Cron (unverified / setup incomplete)", humour: "Subtle", gifKey: "inactiveAccount", render: () => engagement.inactiveAccount({ name: NAME }) },
  { key: "birthday", category: "Engagement", label: "Birthday wishes", recipient: "User on their birthday", trigger: "Daily cron (birthday, IST)", humour: "High", gifKey: "birthday", render: () => engagement.birthday({ name: NAME }) },
  { key: "festival", category: "Engagement", label: "Festival greeting", recipient: "All users", trigger: "Cron (festival calendar)", humour: "Subtle", gifKey: "festival", render: () => engagement.festival({ name: NAME, festival: "Diwali" }) },

  // Contact
  { key: "contactConfirmation", category: "Contact", label: "Contact form confirmation", recipient: "Visitor", trigger: "Contact form submit", humour: "Subtle", gifKey: "contactConfirmation", render: () => contact.contactConfirmation({ name: NAME }) },
  { key: "projectInquiry", category: "Contact", label: "Project inquiry response", recipient: "Prospect", trigger: "Admin replies to inquiry", humour: "Subtle", gifKey: "projectInquiry", render: () => contact.projectInquiry({ name: NAME, message: "Thanks for the detail on the project — the scope makes sense. I've got a slot this week to walk through the AEO approach and rough timeline. Grab a time below and we'll take it from there." }) },

  // Games
  { key: "newGame", category: "Games", label: "New game released", recipient: "Players", trigger: "Admin adds a new game", humour: "High", gifKey: "newGame", render: () => games.newGame({ name: NAME, gameName: "Integra", href: `${SITE}/games/integra` }) },
  { key: "weeklyLeaderboard", category: "Games", label: "Weekly leaderboard", recipient: "Players", trigger: "Weekly cron (Mon)", humour: "Subtle", gifKey: "weeklyLeaderboard", render: () => games.weeklyLeaderboard({ gameName: "Alfazy", rows: [{ rank: 1, name: "Meera I.", score: "1,240" }, { rank: 2, name: "Rohan K.", score: "1,180" }, { rank: 3, name: "Priya S.", score: "1,090" }], yourRank: 7, href: `${SITE}/games/alfazy/leaderboard` }) },
  { key: "achievementUnlocked", category: "Games", label: "Achievement unlocked", recipient: "Player", trigger: "Result submit (first win / streak / #1)", humour: "High", gifKey: "achievementUnlocked", render: () => games.achievementUnlocked({ name: NAME, achievement: "7-day streak", detail: "A full week of Alfazy without missing a day. Rare air.", href: `${SITE}/games/alfazy` }) },
  { key: "streakReminder", category: "Games", label: "Streak reminder", recipient: "Player with active streak", trigger: "Daily cron (streak at risk)", humour: "Subtle", gifKey: "streakReminder", render: () => games.streakReminder({ name: NAME, streak: 7, gameName: "Alfazy", href: `${SITE}/games/alfazy` }) },
];

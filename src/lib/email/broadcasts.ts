/**
 * Codified email designs (the HTML files under Website Emails/) as ready-to-send
 * builders. Pure string builders over the shared `renderEmail` shell — no
 * server-only deps, safe to import anywhere.
 *
 * `BROADCAST_TEMPLATES` are the campaign emails the admin Broadcast page can send
 * to the whole active list. The transactional builders below (confirm, goodbye)
 * are codified and callable but intentionally NOT in the picker — a confirm or
 * farewell has no place in a mass send. Wire them to a trigger to use.
 */

import { renderEmail } from "./template";

export type BroadcastTemplate = {
  id: string;
  name: string;
  /** Shown in the admin picker so the operator knows what they're sending. */
  description: string;
  subject: string;
  html: string;
  text: string;
};

const P = (s: string) =>
  `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">${s}</p>`;
const H2 = (s: string) =>
  `<h2 style="margin:24px 0 12px;font-size:18px;font-weight:600;color:#202124">${s}</h2>`;
const UL = (items: string[]) =>
  `<ul style="margin:0 0 24px 22px;padding:0;font-size:14px;color:#3c4043;line-height:1.6">${items
    .map((i) => `<li>${i}</li>`)
    .join("")}</ul>`;
const SMALL = (s: string) =>
  `<p style="margin:0;font-size:13px;color:#5f6368;line-height:1.7">${s}</p>`;

export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  {
    id: "w1-blueprint",
    name: "W1 — Growth Blueprint Session",
    description: "Long-form pitch for a 30-min blueprint consult. CTA → /consulting.",
    subject: "If you're building something meaningful, let's structure it",
    text:
      "Most founders don't have a growth problem — they have a clarity problem. " +
      "Book a 30-minute Growth Blueprint Session: https://shubhamdatarkar.com/consulting",
    html: renderEmail({
      preheader: "A 30-minute strategic blueprint for builders who want clarity.",
      headerTagline: "Growth Blueprint Session",
      title: "If you're building something meaningful, let's structure it properly.",
      bodyHtml:
        P("Most founders don't have a growth problem. They have a clarity problem.") +
        P(
          "They're running ads without a narrative. Publishing content without distribution. Hiring before systems exist. Scaling before foundations are stable.",
        ) +
        P("That's expensive.") +
        H2("Here's What We'll Do") +
        UL([
          "Audit your current growth model.",
          "Identify bottlenecks.",
          "Design a simple acquisition architecture.",
          "Map out a leverage-first action plan.",
        ]) +
        P("You walk away with a clear blueprint. Not motivation. Not theory. A plan.") +
        P("The session is 30 minutes. Focused. Direct. Practical."),
      cta: { label: "Book Your Blueprint Session", href: "https://shubhamdatarkar.com/consulting" },
      afterCta: SMALL(
        "I only open a limited number of slots each week. If it aligns, we'll continue working together. If not, you still leave with clarity.",
      ),
      heroImageUrl: "https://i.giphy.com/DrO4Bm325pjhc0BRM0.webp",
    }),
  },
  {
    id: "w1_5-slots-left",
    name: "W1.5 — Only 5 slots left",
    description: "Scarcity follow-up to W1. CTA → /book-session.",
    subject: "Only 5 blueprint sessions left this week",
    text:
      "There are 5 blueprint sessions left this week — after that bookings close until next cycle. " +
      "Secure your slot: https://shubhamdatarkar.com/book-session",
    html: renderEmail({
      preheader: "Only 5 blueprint sessions remaining before this week closes.",
      headerTagline: "5 Blueprint Sessions Remaining",
      title: "Quick update.",
      bodyHtml:
        P("There are 5 blueprint sessions left for this week.") +
        P("After that, bookings close until next cycle.") +
        P("If you're:") +
        UL([
          "Scaling without clear acquisition structure",
          "Running campaigns without compounding systems",
          "Unsure where your growth bottleneck actually is",
        ]) +
        P("This session gives you clarity fast.") +
        `<p style="margin:0 0 24px;font-size:14px;font-weight:500;color:#202124;line-height:1.7">30 minutes.<br>Focused strategy.<br>Clear next moves.</p>`,
      cta: { label: "Secure Your Slot", href: "https://shubhamdatarkar.com/book-session" },
      afterCta: SMALL(
        "If it aligns, we'll build something serious. If not, you'll still walk away sharper.",
      ),
      heroImageUrl:
        "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExenpoaWcwcHh0cXRqaTJ4eXpsZTI2anQyeGVhYngwZjE5OXM1MDVieSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2YWxPbinlJYX5zMc/giphy.gif",
    }),
  },
  {
    id: "w2-announcement",
    name: "W2 — It's Official (announcement)",
    description: "Launch announcement for the blueprint sessions. CTA → /consulting.",
    subject: "It's official.",
    text:
      "I'm opening structured Growth Blueprint Sessions — 30 minutes of focused clarity. " +
      "Apply: https://shubhamdatarkar.com/consulting",
    html: renderEmail({
      preheader: "A new chapter begins. Structured growth, zero noise.",
      headerTagline: "Announcement",
      title: "It's Official.",
      bodyHtml:
        P(
          "After years of building behind the scenes, refining systems, testing frameworks, and engineering growth models…",
        ) +
        P("I'm opening structured Growth Blueprint Sessions.") +
        P("This isn't consulting theatre. It's 30 minutes of focused clarity.") +
        H2("Who This Is For") +
        UL([
          "Founders scaling beyond early traction",
          "Brands running ads without a compounding system",
          "Builders who want leverage, not noise",
        ]) +
        H2("What You Leave With") +
        UL([
          "Clear growth bottleneck diagnosis",
          "Acquisition structure blueprint",
          "Prioritized next steps",
        ]) +
        P("No fluff. No generic playbooks. Just architecture."),
      cta: { label: "Apply for a Blueprint Session", href: "https://shubhamdatarkar.com/consulting" },
      afterCta: SMALL(
        "Spots are intentionally limited to maintain depth. If it aligns, we build something serious.",
      ),
      heroImageUrl:
        "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHIweHluaGVvNzl2c3p1d3phZDNnNHQyZDJlemZxZGNqNjZ2cTJvYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HFkA6omUyjVYqw8/giphy.gif",
    }),
  },
  {
    id: "w3-insights",
    name: "W3 — 3 Things Worth Reading (digest)",
    description: "3-card content digest. Update the card links before sending.",
    subject: "3 things worth reading",
    text:
      "Three sharp breakdowns on growth, leverage, and systems. Read them: https://shubhamdatarkar.com/blog",
    html: renderEmail({
      preheader: "Three sharp breakdowns on growth, leverage, and systems.",
      headerTagline: "Latest Insights",
      title: "3 Things Worth Reading",
      // Cards + custom buttons live in the body; no single `cta`.
      bodyHtml:
        `<p style="margin:0 0 28px;font-size:14px;color:#5f6368;line-height:1.7">Short. Tactical. Built for operators.</p>` +
        [
          {
            h: "Why Most Startups Burn Ad Budget",
            p: "Traffic is rarely the problem. System architecture is. Here's how to stop funding chaos and start engineering acquisition.",
          },
          {
            h: "The Compounding SEO Model",
            p: "Most SEO is content production. Real SEO is leverage creation. Build assets that lower CAC over time.",
          },
          {
            h: "Campaigns vs Growth Infrastructure",
            p: "Running ads is easy. Building predictable revenue is not. Here's the structural difference most brands miss.",
          },
        ]
          .map(
            (c) =>
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #edf0f2;border-radius:10px"><tr><td style="padding:22px">` +
              `<h2 style="margin:0 0 10px;font-size:18px;font-weight:600;color:#202124">${c.h}</h2>` +
              `<p style="margin:0 0 16px;font-size:14px;color:#5f6368;line-height:1.6">${c.p}</p>` +
              `<a href="https://shubhamdatarkar.com/blog" style="display:inline-block;padding:8px 18px;background:#ff4800;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none">Read More</a>` +
              `</td></tr></table>`,
          )
          .join("") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" class="mobile-center"><a href="https://shubhamdatarkar.com/blog" class="cta-full" style="display:inline-block;padding:12px 26px;background:#202124;color:#ffffff;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none">Explore All</a></td></tr></table>`,
    }),
  },
];

/**
 * Confirm-your-subscription (double opt-in). Codified from the design, callable
 * when you wire double opt-in. ponytail: single opt-in today, so `confirmUrl`
 * has no token — pass a real confirm link once /confirm exists to make it work.
 */
export function buildConfirmEmail(
  confirmUrl = "https://shubhamdatarkar.com/subscribe",
): { subject: string; text: string; html: string } {
  return {
    subject: "Confirm your subscription",
    text: `One quick step: confirm your subscription to Shubham Datarkar's Newsletter — ${confirmUrl}`,
    html: renderEmail({
      preheader: "One quick step to complete your subscription.",
      headerTagline: "Confirm Your Subscription",
      title: "One quick step.",
      bodyHtml:
        P("You recently subscribed to Shubham Datarkar's Newsletter.") +
        P(
          "Before I start sending strategy, frameworks, and subscriber-only assets, I need you to confirm this email address.",
        ) +
        P("This keeps the list clean and ensures you actually want what's coming.") +
        SMALL("If you didn't subscribe, you can safely ignore this email."),
      cta: { label: "Confirm My Subscription", href: confirmUrl },
      heroImageUrl:
        "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjI4MmR1MjNmNjlpNmFtYWplYTVvN3lvdHdqNHVqcDF0cGVwenM1aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CzbiCJTYOzHTW/giphy.gif",
    }),
  };
}

/**
 * "Before You Go" farewell (rich, dark theme — its own shell, not renderEmail).
 * Codified from good-bye.html, callable if you wire a farewell on unsubscribe.
 * ponytail: the stats and the phone number are STATIC PLACEHOLDERS from the
 * design — replace with real values (or pull live counts) before sending.
 */
export function buildGoodbyeEmail(
  resubscribeUrl = "https://shubhamdatarkar.com/subscribe",
): { subject: string; text: string; html: string } {
  const stat = (n: string, label: string, color: string) =>
    `<td align="center" style="padding:20px"><div style="font-size:30px;font-weight:600;color:${color}">${n}</div><div style="font-size:12px;color:#6b7280">${label}</div></td>`;
  return {
    subject: "Before you go",
    text: "You've unsubscribed. Thank you for being part of this chapter. Resubscribe anytime: " + resubscribeUrl,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Before You Go</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body,table,td,p,a{margin:0;padding:0;font-family:Poppins,Arial,Helvetica,sans-serif}table{border-collapse:collapse}img{display:block;border:0;max-width:100%}.container{width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden}@media screen and (max-width:640px){.container{width:100%!important}}</style></head><body style="background:#f3f5f7;padding:30px 0"><center><table width="100%"><tr><td align="center"><table class="container"><tr><td style="padding:40px 30px;text-align:center;background:#202124;color:#ffffff"><h1 style="font-size:28px;font-weight:600">Before You Go</h1><p style="font-size:14px;color:#d1d5db;margin-top:10px">A small note from the Shubham Datarkar Newsletter</p></td></tr><tr><td style="padding:40px 30px;font-size:15px;color:#5f6368;line-height:1.8">You've decided to unsubscribe. That's completely fair. But before you go, I wanted to pause for a moment and share what happened while you were part of this journey.</td></tr><tr><td style="padding:30px;background:#f9fafb"><table width="100%"><tr>${stat("184,327", "Readers", "#FE5100")}${stat("412", "Letters Sent", "#22B24C")}</tr><tr>${stat("4.3 Years", "Writing", "#1B75BC")}${stat("73", "Countries Reading", "#F8B400")}</tr></table></td></tr><tr><td style="padding:40px 30px;font-size:14px;color:#5f6368;line-height:1.9">When you first joined, this newsletter was still a quiet corner of the internet. Since then it has grown into a place where ideas about marketing, storytelling, the internet, and business get explored week after week. And through that time, you were one of the people reading along.</td></tr><tr><td style="padding:40px 30px;text-align:center"><p style="font-size:20px;color:#202124;line-height:1.6">"A newsletter is just one person writing — until someone reads it."</p><p style="font-size:13px;color:#9aa0a6;margin-top:6px">— Shubham Datarkar</p></td></tr><tr><td align="center" style="padding:30px"><a href="${resubscribeUrl}" style="display:inline-block;padding:12px 26px;border:1px solid #202124;color:#202124;text-decoration:none;font-size:14px;border-radius:6px">You're always welcome back</a></td></tr><tr><td style="background:#202124;color:#ffffff;text-align:center;padding:18px;font-size:11px;line-height:1.6">You received this email because you previously subscribed to the <b>Shubham Datarkar Newsletter</b>.<br><br>This will be the last email you receive after unsubscribing.</td></tr></table></td></tr></table></center></body></html>`,
  };
}

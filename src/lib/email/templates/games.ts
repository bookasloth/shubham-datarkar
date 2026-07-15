import { renderEmail, emailGif, emailDetails } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p } from "./_shared";

/** New game released. Humour: High. */
export function newGame(a: { name?: string | null; gameName: string; href: string; blurb?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `New game: ${a.gameName}`,
    html: renderEmail({
      preheader: "A new way to lose track of ten minutes.",
      headerTagline: "Games",
      title: `${esc(a.gameName)} is live.`,
      bodyHtml:
        emailGif(EMAIL_GIFS.newGame, "A game controller powering up") +
        p(`Hey ${esc(first)}, there's a new game in the arcade — ${esc(a.gameName)}. ${esc(a.blurb || "Easy to learn, mildly infuriating to master. You know the drill.")}`) +
        p("First round's the hardest. Go set a score before everyone else does."),
      cta: { label: `Play ${esc(a.gameName)}`, href: a.href },
    }),
    text: `Hey ${first}, new game in the arcade: ${a.gameName}. ${a.blurb || ""} Play it: ${a.href}`,
  };
}

/** Weekly leaderboard. Humour: Subtle. */
export function weeklyLeaderboard(a: { gameName: string; rows: { rank: number; name: string; score: string }[]; yourRank?: number; href: string }): RenderedEmail {
  return {
    subject: `This week's ${a.gameName} leaderboard`,
    html: renderEmail({
      preheader: "The standings are in. Bragging rights included.",
      headerTagline: "Weekly leaderboard",
      title: `${esc(a.gameName)} — this week's top players`,
      bodyHtml:
        emailGif(EMAIL_GIFS.weeklyLeaderboard, "A trophy on a winner's podium", 360) +
        p("The week's standings are settled. Here's who topped the board:") +
        emailDetails(a.rows.map((r) => ({ label: `#${r.rank}`, value: `${esc(r.name)} — ${esc(r.score)}` }))) +
        (a.yourRank ? p(`You landed at <strong>#${a.yourRank}</strong> this week. A fresh board opens now — plenty of room to climb.`) : p("A fresh board opens now. Your move.")),
      cta: { label: "Take your shot", href: a.href },
    }),
    text:
      `This week's ${a.gameName} leaderboard:\n\n` +
      a.rows.map((r) => `#${r.rank}  ${r.name} — ${r.score}`).join("\n") +
      (a.yourRank ? `\n\nYou: #${a.yourRank}` : "") +
      `\n\nPlay: ${a.href}`,
  };
}

/** Achievement unlocked (first win / streak milestone / #1). Humour: High. */
export function achievementUnlocked(a: { name?: string | null; achievement: string; detail?: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Achievement unlocked: ${a.achievement}`,
    html: renderEmail({
      preheader: "You earned this one. Take the little dopamine hit.",
      headerTagline: "Games",
      title: "Achievement unlocked",
      bodyHtml:
        emailGif(EMAIL_GIFS.achievementUnlocked, "A badge unlocking with a shine", 340) +
        p(`Nice one, ${esc(first)}. You just earned:`) +
        `<p style="margin:0 0 12px; font-size:18px; font-weight:700; color:#202124;">${esc(a.achievement)}</p>` +
        (a.detail ? p(esc(a.detail)) : p("Small thing, real thing. Go chase the next one.")),
      cta: { label: "Keep playing", href: a.href },
    }),
    text: `Nice one, ${first}. Achievement unlocked: ${a.achievement}.${a.detail ? ` ${a.detail}` : ""} Keep playing: ${a.href}`,
  };
}

/** Streak at risk. Humour: Subtle. */
export function streakReminder(a: { name?: string | null; streak: number; gameName?: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  const where = a.gameName ? ` in ${esc(a.gameName)}` : "";
  return {
    subject: `Your ${a.streak}-day streak is on the line`,
    html: renderEmail({
      preheader: "One quick round keeps it alive.",
      headerTagline: "Games",
      title: `Don't drop the streak, ${esc(first)}`,
      bodyHtml:
        emailGif(EMAIL_GIFS.streakReminder, "A small flame flickering", 300) +
        p(`You're on a <strong>${a.streak}-day</strong> run${where}. That's a real thing you built one day at a time — and it resets at midnight if today's round goes unplayed.`) +
        p("One quick game keeps it alive. Then you're free."),
      cta: { label: "Play today's round", href: a.href },
    }),
    text: `${first}, your ${a.streak}-day streak${where} resets at midnight. One quick round keeps it alive: ${a.href}`,
  };
}

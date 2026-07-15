import { renderEmail, emailGif, emailDetails } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

/** New game released. Humour: High. */
export function newGame(a: { name?: string | null; gameName: string; href: string; blurb?: string }): RenderedEmail {
  const first = firstName(a.name);
  const game = esc(a.gameName);
  return {
    subject: "I made another way to waste your time",
    html: renderEmail({
      preheader: `New game: ${game}. Productivity was nice while it lasted.`,
      headerTagline: "Games",
      title: "I made another way to waste your time",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("I made a new game.") +
        p(`It's called <strong>${game}</strong>.`) +
        (a.blurb ? p(esc(a.blurb)) : "") +
        p("It looks easy.") +
        p("This is intentional deception.") +
        p("Your first attempt will probably be terrible.") +
        p("Your second attempt will happen immediately after.") +
        p("Sorry in advance."),
      cta: { label: "Fine, let me play", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.newGame, "A game controller powering up"),
    }),
    text: `Hey ${first}, I made a new game — ${a.gameName}. ${a.blurb || ""} It looks easy; this is intentional deception. Play it: ${a.href}`,
  };
}

/** Weekly leaderboard. Humour: Subtle. */
export function weeklyLeaderboard(a: { gameName: string; rows: { rank: number; name: string; score: string }[]; yourRank?: number; href: string }): RenderedEmail {
  const game = esc(a.gameName);
  return {
    subject: a.yourRank ? `You finished #${a.yourRank}. We need to talk.` : `This week's ${a.gameName} leaderboard`,
    html: renderEmail({
      preheader: `The ${game} leaderboard is in. Evidence has been collected.`,
      headerTagline: "Weekly leaderboard",
      title: "The leaderboard is in",
      bodyHtml:
        p("Hey there,") +
        p(`The weekly ${game} leaderboard is settled.`) +
        emailDetails(a.rows.map((r) => ({ label: `#${r.rank}`, value: `${esc(r.name)} — ${esc(r.score)}` }))) +
        (a.yourRank
          ? p(`You finished at <strong>#${a.yourRank}</strong>.`) +
            p("Whether that deserves celebration or immediate revenge depends entirely on where you landed.")
          : p("A fresh board opens now.")) +
        p("Conveniently, there's a fresh board waiting."),
      cta: { label: "I can do better than that", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.weeklyLeaderboard, "A trophy on a winner's podium", 360),
    }),
    text:
      `This week's ${a.gameName} leaderboard:\n\n` +
      a.rows.map((r) => `#${r.rank}  ${r.name} — ${r.score}`).join("\n") +
      (a.yourRank ? `\n\nYou: #${a.yourRank}` : "") +
      `\n\nA fresh board's open: ${a.href}`,
  };
}

/** Achievement unlocked (first win / streak milestone / #1). Humour: High. */
export function achievementUnlocked(a: { name?: string | null; achievement: string; detail?: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Look at you, achieving things",
    html: renderEmail({
      preheader: `You just unlocked ${esc(a.achievement)}.`,
      headerTagline: "Games",
      title: "Look at you, achieving things",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("You just unlocked:") +
        `<p style="margin:0 0 16px; font-size:18px; font-weight:700; color:#202124;">${esc(a.achievement)}</p>` +
        (a.detail ? p(esc(a.detail)) : "") +
        p("Does this materially improve your life?") +
        p("Probably not.") +
        p("Does the tiny dopamine hit still count?") +
        p("Absolutely."),
      cta: { label: "Chase another one", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.achievementUnlocked, "A badge unlocking with a shine", 340),
    }),
    text: `Hey ${first}, you just unlocked: ${a.achievement}.${a.detail ? ` ${a.detail}` : ""} Does it improve your life? Probably not. Does the dopamine count? Absolutely. Chase another: ${a.href}`,
  };
}

/** Streak at risk. Humour: Subtle. */
export function streakReminder(a: { name?: string | null; streak: number; gameName?: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  const where = a.gameName ? ` in ${esc(a.gameName)}` : "";
  return {
    subject: "I'm not saying you'll lose your streak, but…",
    html: renderEmail({
      preheader: `${a.streak} days of work disappear at midnight. Just mentioning it.`,
      headerTagline: "Games",
      title: "I'm not saying you'll lose your streak, but…",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`You currently have a <strong>${a.streak}-day streak</strong>${where}.`) +
        p("Very nice.") +
        p("It also resets at midnight if you don't play today.") +
        p("Less nice.") +
        p("One game.") +
        p("That's all.") +
        p("Then you may return to pretending you're a responsible adult."),
      cta: { label: "Save my streak", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.streakReminder, "A small flame flickering", 300),
    }),
    text: `Hey ${first}, you have a ${a.streak}-day streak${where}. It resets at midnight if you don't play today. One game — that's all. Save it: ${a.href}`,
  };
}

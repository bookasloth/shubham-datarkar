/**
 * Preset thank-you captions for the auto post, bucketed by the amount of the
 * payment made at that moment. 30 per tier; one is picked at random on each new
 * paid support. Pure (only node:crypto) so it can be unit-tested directly.
 *
 * Tiers mirror the supporter thresholds in config.ts:
 *   small  → < ₹1000   (Torchbearer range)
 *   medium → ₹1000–2499 (Guardian range)
 *   large  → ≥ ₹2500    (Pillar range)
 */
import { randomInt } from "node:crypto";

export type MessageTier = "small" | "medium" | "large";

/** Map a single payment's total (₹) to its message tier. */
export function messageTierFor(totalAmount: number): MessageTier {
  if (totalAmount >= 2500) return "large";
  if (totalAmount >= 1000) return "medium";
  return "small";
}

const SMALL: readonly string[] = [
  "Thank you for the coffee. Small gestures keep the big work going.",
  "Every little bit counts, and this one just did. Thank you.",
  "A quiet thank-you for a generous nudge. It means a lot.",
  "This one goes straight into more free tools and writing. Grateful.",
  "You just fuelled the next late-night build. Thank you.",
  "Kindness like this is why the lights stay on. Thank you.",
  "A coffee's worth of belief goes a long way. Truly appreciate it.",
  "Thank you for backing the work before it pays you back.",
  "Small support, real impact. This keeps the experiments alive.",
  "You didn't have to, and you did. Thank you for that.",
  "Another day of building made possible by you. Grateful.",
  "This is the kind of nudge that keeps me writing. Thank you.",
  "Appreciate you dropping something in the tip jar. It matters.",
  "Your support turns into someone's free tool tomorrow. Thank you.",
  "Thank you for the vote of confidence in caffeine form.",
  "The small ones add up to something real. Thank you for yours.",
  "You just made the roadmap a little more possible. Grateful.",
  "A warm thank-you for a warm gesture. It keeps me going.",
  "Every coffee is a reminder someone's out there. Thank you.",
  "This support pays for the next thing I give away free. Thanks.",
  "Grateful you thought the work was worth a little. It is to me too.",
  "Thank you for being early and generous at the same time.",
  "A little support, a lot of motivation. Thank you sincerely.",
  "You kept a builder building today. That's no small thing. Thank you.",
  "This one lands right in the fuel tank. Much appreciated.",
  "Thank you for turning a moment of appreciation into action.",
  "Your coffee is now part of the story. Thank you for that.",
  "Small and mighty. Thank you for the boost.",
  "Grateful for the gesture and the belief behind it. Thank you.",
  "Thank you for keeping independent work independent.",
] as const;

const MEDIUM: readonly string[] = [
  "This is real generosity, and it doesn't go unnoticed. Thank you.",
  "A serious thank-you for a serious show of support.",
  "You just moved the needle on what I can build next. Grateful.",
  "This kind of backing changes the pace of the work. Thank you.",
  "Thank you for going well beyond a coffee. It truly helps.",
  "Support like this buys focus and time. I won't waste it. Thank you.",
  "You believed enough to give generously. That means everything.",
  "This lands as more than money; it lands as momentum. Thank you.",
  "Grateful for a gift that lets me say yes to bigger ideas.",
  "Thank you for stepping up when it counts. I feel the trust.",
  "This is the fuel for the next real milestone. Deeply grateful.",
  "You just underwrote a chunk of the roadmap. Thank you.",
  "A generous hand today keeps free work free tomorrow. Thank you.",
  "This kind of support is rare and I don't take it lightly. Thank you.",
  "Thank you for investing in the work, not just applauding it.",
  "You made a real dent in what's possible this month. Grateful.",
  "Support at this level earns my best effort. Thank you for it.",
  "This buys the quiet, focused hours the good stuff needs. Thank you.",
  "Thank you for the kind of gift that raises the ceiling.",
  "You're helping more than me here; you're helping everyone who uses this. Thanks.",
  "Grateful beyond a quick thank-you. This one sticks with me.",
  "You backed the vision with real weight. I'm honoured. Thank you.",
  "This support turns plans into shipped things. Thank you sincerely.",
  "Thank you for a generosity that lets me think bigger.",
  "You just bought runway for the next experiment. Grateful.",
  "A heartfelt thank-you for a genuinely generous gesture.",
  "This is the kind of support that compounds. Thank you deeply.",
  "You gave the work room to breathe. I'm grateful for it.",
  "Thank you for treating this like it matters. It does, and so do you.",
  "Real support, real gratitude. Thank you for the strong push.",
] as const;

const LARGE: readonly string[] = [
  "This is extraordinary. Thank you for holding the roof up.",
  "A gift this size changes the trajectory. I'm deeply grateful.",
  "You just became a pillar of this work. Thank you, truly.",
  "Words feel small for support this large. Thank you all the same.",
  "This is the kind of backing that makes ambitious things real. Thank you.",
  "You've done more than support; you've invested. I won't forget it.",
  "Thank you for a generosity that leaves me genuinely moved.",
  "Support at this level is a responsibility I take seriously. Thank you.",
  "You just funded a real leap forward. I'm honoured and grateful.",
  "This holds the lights on for a long while. Thank you profoundly.",
  "A gift like this earns my very best work. Thank you for the trust.",
  "You believed at a scale most never do. Deeply, sincerely, thank you.",
  "This lands as a milestone in itself. Thank you for making it possible.",
  "Thank you for standing so firmly behind independent work.",
  "You've bought serious runway for serious ideas. I'm grateful beyond words.",
  "This is patronage in the best sense. Thank you for believing this much.",
  "You just made a year's worth of free tools possible. Thank you.",
  "Generosity like this is humbling. I'll make it count. Thank you.",
  "Thank you for a gift that raises the whole ceiling of what I can do.",
  "You're not on the sidelines; you're building this with me. Thank you.",
  "This kind of support writes the next chapter. I'm grateful for you.",
  "Thank you for the rare and remarkable vote of confidence.",
  "You've given the work real weight to stand on. Profound thanks.",
  "A pillar-level thank-you for a pillar-level gift. I'm honoured.",
  "This changes what's possible, full stop. Thank you sincerely.",
  "You just underwrote something bigger than a coffee could dream of. Thank you.",
  "Grateful doesn't quite cover it, but it's a start. Thank you deeply.",
  "You held the whole thing up today. I won't take it for granted. Thank you.",
  "Thank you for the kind of support builders rarely get to feel.",
  "This is generosity that echoes. Thank you for believing in the work.",
] as const;

const POOLS: Record<MessageTier, readonly string[]> = {
  small: SMALL,
  medium: MEDIUM,
  large: LARGE,
};

/** Pick a random preset thank-you caption for a payment of `totalAmount` (₹). */
export function pickThankyouMessage(totalAmount: number): string {
  const pool = POOLS[messageTierFor(totalAmount)];
  return pool[randomInt(0, pool.length)];
}

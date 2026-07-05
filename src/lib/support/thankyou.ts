import "server-only";

import { randomInt } from "node:crypto";
import { insertUpdate, getThankyouImages } from "@/lib/support/updates";
import { thankyouAuthor } from "@/lib/support/aliases";
import { pickThankyouMessage } from "@/lib/support/thankyou-messages";
import type { SupportRow } from "@/lib/support/server";

/**
 * Post a system thank-you to the updates feed for a freshly-paid support.
 * The caption is a random preset picked from the tier matching this payment's
 * amount. Best-effort: fully guarded so a failure never breaks the confirm.
 */
export async function postThankyou(support: SupportRow): Promise<void> {
  try {
    const images = await getThankyouImages();
    const image = images.length ? images[randomInt(0, images.length)] : null;
    await insertUpdate({
      type: "thankyou",
      body: pickThankyouMessage(support.totalAmount),
      media: image ? { url: image } : {},
      author: thankyouAuthor({ name: support.name, anonymous: support.anonymous }),
    });
  } catch (e) {
    console.warn("[support] thank-you post failed:", (e as Error).message);
  }
}

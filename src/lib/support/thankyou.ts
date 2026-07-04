import "server-only";

import { randomInt } from "node:crypto";
import { insertUpdate, getThankyouImages } from "@/lib/support/updates";
import { thankyouAuthor } from "@/lib/support/aliases";
import type { SupportRow } from "@/lib/support/server";

const THANKYOU_CAPTION =
  "Thank you for the support. Every coffee and toffee keeps the free tools, writing, and experiments coming.";

/**
 * Post a system thank-you to the updates feed for a freshly-paid support.
 * Best-effort: fully guarded so a failure never breaks the payment confirm.
 */
export async function postThankyou(support: SupportRow): Promise<void> {
  try {
    const images = await getThankyouImages();
    const image = images.length ? images[randomInt(0, images.length)] : null;
    await insertUpdate({
      type: "thankyou",
      body: THANKYOU_CAPTION,
      media: image ? { url: image } : {},
      author: thankyouAuthor({ name: support.name, anonymous: support.anonymous }),
    });
  } catch (e) {
    console.warn("[support] thank-you post failed:", (e as Error).message);
  }
}

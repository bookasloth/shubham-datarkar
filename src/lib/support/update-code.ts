/** Shared update types + 6-digit code generator. Pure — no server deps. */
import { randomInt } from "node:crypto";

import type { VideoEmbed } from "./video";

export type UpdateType = "text" | "image" | "video" | "thankyou";

export type UpdateMedia =
  | Record<string, never>
  | { url: string } // image / thankyou
  | VideoEmbed; // video

export type UpdateAuthor = { name: string } | { alias: string };

export type SupportUpdate = {
  code: string;
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author: UpdateAuthor | null;
  createdAt: string;
};

/** Random inclusive 6-digit code (100000–999999). Collisions handled at insert. */
export function generateCode(): string {
  return String(randomInt(100000, 1_000_000));
}

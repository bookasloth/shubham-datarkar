/** Capability keys the app checks. Plans bundle these; features require them. Pure — no imports. */

export type Capability =
  | "view_archive"
  | "view_premium_blog"
  | "view_premium_case_study"
  | "view_premium_video"
  | "view_premium_course"
  | "view_premium_album"
  | "view_premium_resource"
  | "download_assets"
  | "download_templates"
  | "access_prompt_library"
  | "play_unlimited_games"
  | "earn_achievements"
  | "streak_history"
  | "join_private_community"
  | "attend_live_sessions"
  | "access_beta_features"
  | "early_access"
  | "use_kalamai"
  | "create_challenge"
  | "admin_only";

export const ALL_CAPABILITIES: Capability[] = [
  "view_archive", "view_premium_blog", "view_premium_case_study",
  "view_premium_video", "view_premium_course", "view_premium_album",
  "view_premium_resource", "download_assets", "download_templates",
  "access_prompt_library", "play_unlimited_games", "earn_achievements",
  "streak_history", "join_private_community", "attend_live_sessions",
  "access_beta_features", "early_access", "use_kalamai", "create_challenge", "admin_only",
];

/** Everything a plan may grant (admin_only is never plan-granted). */
export const GRANTABLE_CAPABILITIES: Capability[] = ALL_CAPABILITIES.filter(
  (c) => c !== "admin_only",
);

export function can(caps: ReadonlySet<string>, cap: Capability): boolean {
  return caps.has(cap);
}

const TYPE_CAPABILITY: Record<string, Capability> = {
  article: "view_premium_blog",
  "case-study": "view_premium_case_study",
  video: "view_premium_video",
  prompt: "access_prompt_library",
  template: "download_templates",
  download: "download_assets",
};

/** Capability a "Member"-level resource of this type requires. */
export function requiredCapabilityForType(type: string): Capability {
  return TYPE_CAPABILITY[type] ?? "view_premium_resource";
}

/** Human-readable label for a capability key (admin UI). */
export function capabilityLabel(cap: string): string {
  return cap
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

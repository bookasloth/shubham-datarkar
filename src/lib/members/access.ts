/** Pure access-control matrix for the members area. No imports — unit-testable. */

export type MemberRole = "guest" | "member" | "premium" | "admin";
export type Visibility = "free" | "members" | "premium" | "hidden";

const RANK: Record<MemberRole, number> = { guest: 0, member: 1, premium: 2, admin: 3 };
const NEED: Record<Visibility, number> = { free: 0, members: 1, premium: 2, hidden: 3 };

/** Listings always show metadata; this gates content, meta, and downloads. */
export function canAccess(visibility: Visibility, role: MemberRole): boolean {
  return RANK[role] >= NEED[visibility];
}

// Pure, client-safe people types + helpers. NO `server-only` import here, so
// client components (e.g. the People table) can use planLabel/Person without
// dragging the server data layer (auth-server → next/headers) into the client
// bundle. Server data access lives in ./queries.

export type Person = {
  email: string;
  displayName: string;
  userId: string | null;
  verified: boolean;
  contacted: boolean;
  contactCount: number;
  subscribed: boolean;
  donated: boolean;
  donationTotal: number;
  isGamer: boolean;
  planKey: string | null;
  membershipStatus: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type TimelineEntry = {
  kind: string;
  occurredAt: string | null;
  title: string;
  detail: string | null;
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Admin badge: active membership → Premium; any verified account → Free; lead → —. */
export function planLabel(p: Pick<Person, "userId" | "planKey" | "membershipStatus">): "Premium" | "Free" | "—" {
  if (p.membershipStatus === "active" && p.planKey) return "Premium";
  if (p.userId) return "Free";
  return "—";
}

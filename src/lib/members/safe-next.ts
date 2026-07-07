/** Only allow same-app members return paths; never an open redirect. */
export function safeMembersNext(raw: FormDataEntryValue | string | null): string {
  const v = String(raw ?? "");
  return v === "/members" || v.startsWith("/members/") ? v : "/members";
}

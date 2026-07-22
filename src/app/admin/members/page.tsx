import { redirect } from "next/navigation";

// The member list merged into People — every per-user action now lives on the
// People profile page (/admin/people/[email]). Kept as a redirect so old
// bookmarks and links still land somewhere sensible.
export default function MembersAdminPage() {
  redirect("/admin/people");
}

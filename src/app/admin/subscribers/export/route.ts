import { getAdminUser } from "@/lib/auth/session";
import { getSubscribers } from "@/lib/subscribers/queries";

export const dynamic = "force-dynamic";

/** Quote a CSV cell when it contains a comma, quote, or newline. */
function cell(value: string): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Admin-only CSV download of all subscribers. Opens cleanly in Excel/Sheets. */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const subs = await getSubscribers();
  const header = ["Email", "Source", "Status", "Joined"];
  const rows = subs.map((s) => [s.email, s.source ?? "", s.status, s.createdAt]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  const BOM = "﻿"; // so Excel reads the file as UTF-8

  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

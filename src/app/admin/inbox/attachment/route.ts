import { requireAdmin } from "@/lib/auth/session";
import { getEmailCredentials } from "@/lib/email/store";
import { getAttachment } from "@/lib/email/imap";

export const dynamic = "force-dynamic";

/**
 * Stream a single inbox attachment as a file download. Admin-only. The
 * attachment is identified by the message UID plus its index in the parsed
 * attachment list (see getMessage/getAttachment).
 */
export async function GET(request: Request): Promise<Response> {
  await requireAdmin(); // redirects/throws if not admin

  const url = new URL(request.url);
  const uid = Number(url.searchParams.get("uid"));
  const index = Number(url.searchParams.get("index"));
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(index) || index < 0) {
    return new Response("Bad request", { status: 400 });
  }

  const creds = await getEmailCredentials();
  if (!creds) return new Response("Email not configured", { status: 503 });

  try {
    const att = await getAttachment(creds, uid, index);
    const safeName = att.filename.replace(/[\r\n"]/g, "");
    return new Response(new Uint8Array(att.content), {
      headers: {
        "Content-Type": att.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500 });
  }
}

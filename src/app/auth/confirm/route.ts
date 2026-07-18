import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loginDestination } from "@/lib/auth/redirect";
import { sendTemplate } from "@/lib/email/send-template";
import { accountWelcome } from "@/lib/email/templates/auth";

/**
 * Verifies an emailed token_hash (from admin.generateLink) and establishes the
 * session, then routes on. Recovery links carry next=/reset-password so the user
 * lands on the set-new-password form with an active recovery session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  if (!token_hash || !type) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);

  // signup click OR magiclink resend = an email confirmation. Recovery links
  // (next=/reset-password) fall through to the generic redirect below.
  if ((type === "signup" || type === "magiclink") && data.user) {
    // Verifying proves the address — lift any 48h cron ban.
    try {
      await supabaseAdmin().auth.admin.updateUserById(data.user.id, { ban_duration: "none" });
    } catch {
      // Non-fatal — verification succeeded regardless.
    }

    // Newcomers (not yet onboarded) get the welcome mail once and go to /welcome.
    // Keying on onboarded_at (not link type) means a resend confirmation is
    // treated identically to a first signup click.
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!prof?.onboarded_at) {
      if (data.user.email) {
        try {
          await sendTemplate(data.user.email, accountWelcome({ name: data.user.user_metadata?.full_name ?? null }));
        } catch {
          // Confirmation must succeed even if the welcome mail fails.
        }
      }
      const params = next ? `?next=${encodeURIComponent(next)}` : "";
      return NextResponse.redirect(`${origin}/welcome${params}`);
    }
    // Already onboarded (e.g. a later magiclink) — just land them.
    return NextResponse.redirect(`${origin}${next || loginDestination(null, data.user.email)}`);
  }

  const dest = next || loginDestination(null, data.user?.email);
  return NextResponse.redirect(`${origin}${dest}`);
}

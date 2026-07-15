import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { loginDestination } from "@/lib/auth/redirect";

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

  const dest = next || loginDestination(null, data.user?.email);
  return NextResponse.redirect(`${origin}${dest}`);
}

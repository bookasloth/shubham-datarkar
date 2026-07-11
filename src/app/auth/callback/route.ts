import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { postLoginPath } from "@/lib/auth/redirect";

/**
 * Magic-link / OTP landing. The emailed link carries a one-time PKCE `code`;
 * exchange it for a session (writable cookies in a route handler), then route
 * by identity. Any failure drops back to /login with a flag the page surfaces.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);

  return NextResponse.redirect(`${origin}${postLoginPath(data.user?.email)}`);
}

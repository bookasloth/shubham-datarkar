import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 Proxy (renamed from middleware). Node.js runtime by default.
 * Optimistic auth gate only — pages re-verify via requireAdmin().
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // No /login -> /admin bounce. requireAdmin() also gates on ADMIN_EMAIL, so a
  // signed-in non-admin (games/members account — same Supabase cookie) would
  // ping-pong: /admin -> /login -> /admin. signIn() redirects to /admin itself.

  // Games: bounce logged-in users away from the games login page.
  if (path === "/games/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/games";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Members: bounce logged-in users away from the members login page.
  if (path === "/members/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/members";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/games/login",
    "/games/profile/:path*",
    "/members/:path*",
  ],
};

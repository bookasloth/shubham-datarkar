import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 Proxy (renamed from middleware). Node.js runtime by default.
 * Optimistic auth gate only — pages re-verify via requireAdmin().
 */
export async function proxy(request: NextRequest) {
  // Expose the incoming pathname to server components (via headers()) so a
  // section layout can pick a rail based on the sub-route without splitting
  // the shell. Set on the request headers so downstream RSC reads it.
  request.headers.set("x-pathname", request.nextUrl.pathname);

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

  /**
   * getUser() can rotate the refresh token, and setAll() writes the new cookies
   * onto `response`. A bare NextResponse.redirect() would drop them, so the
   * browser would keep replaying the old token until the session dies. Every
   * redirect below must go through here.
   */
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  const path = request.nextUrl.pathname;

  // Community post permalinks resolve by public_id. Legacy /community/p/{uuid}
  // links get a permanent 301 to the canonical public_id URL so nothing breaks.
  // public_id-form (all digits) and unknown ids fall straight through to the
  // page — no auth round trip on the common read path.
  const permalink = path.match(/^\/community\/p\/([^/]+)\/?$/);
  if (permalink) {
    const seg = permalink[1];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      const { data } = await supabase
        .from("community_posts")
        .select("public_id")
        .eq("id", seg)
        .maybeSingle();
      if (data?.public_id != null) {
        const url = request.nextUrl.clone();
        url.pathname = `/community/p/${data.public_id}`;
        return NextResponse.redirect(url, 301);
      }
    }
    return NextResponse.next({ request });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url);
  }

  // No /login -> /admin bounce. requireAdmin() also gates on ADMIN_EMAIL, so a
  // signed-in non-admin (games/members account — same Supabase cookie) would
  // ping-pong: /admin -> /login -> /admin. signIn() redirects to /admin itself.

  // Login is consolidated at /login (its page redirects a signed-in visitor to
  // their destination), so the old segment-scoped /games/login and /members/login
  // shims are gone — no bounce branches needed here.

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/community/p/:path*",
    "/games/:path*",
    "/members/:path*",
    "/tools/kalamai/:path*",
  ],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PRIVATE_PREFIXES = ["/dashboard", "/propertylisting", "/units", "/tenants", "/payments", "/arrears", "/reports", "/utility", "/maintenance", "/settings"];
const AUTH_ROUTES = ["/management-login", "/management-signup", "/forgot-password", "/reset-password", "/verify-email"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // API routes handle their own auth — never redirect them
  if (pathname.startsWith("/api/")) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates + refreshes the token server-side (no browser Web Locks).
  // This is safe here because the server client uses its own in-process lock,
  // separate from the browser client's navigator.locks.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError?.code === "refresh_token_not_found") {
    // Stale cookies — clear them so Supabase stops retrying on every request
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("sb-"))
      .forEach(({ name }) => response.cookies.delete(name));
  }

  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Block unauthenticated access to private pages
  if (isPrivate && !user) {
    const loginUrl = new URL("/management-login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

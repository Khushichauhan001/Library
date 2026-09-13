import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

// This is a private, owner-only tool: every route is protected except the
// login page itself (and the auth API routes / static/PWA assets, which
// must stay reachable so login and the installed PWA can work).
//
// Uses the provider-less auth.config.ts (not the full auth.ts) because
// middleware runs in the Edge Runtime, which can't load bcryptjs/Node APIs
// pulled in by the Credentials provider. This instance can still read the
// session cookie (req.auth) to decide whether to redirect.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    const dashboardUrl = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons/).*)",
  ],
};

import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config, used by middleware. It intentionally has NO
// providers (Credentials + bcryptjs depend on Node.js APIs like `crypto`
// and are not Edge Runtime compatible) - it only knows how to read/redirect
// based on an existing session. The real Credentials provider lives in
// auth.ts, which only ever runs in the Node.js runtime (API routes, server
// actions, server components).
export default {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

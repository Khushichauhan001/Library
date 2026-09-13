import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "./auth.config";

// Single-admin auth. There is no signup flow and no database-backed user
// table for auth purposes - the one allowed admin identity comes entirely
// from env vars (ADMIN_USERNAME / ADMIN_PASSWORD_HASH). The Admin model in
// prisma/schema.prisma exists for record-keeping / future use, but this
// login flow intentionally does not depend on it, so the app still works
// even before any DB seeding of an Admin row.
//
// This full config (with the Credentials provider, which needs bcryptjs /
// Node's `crypto`) must only be imported from Node.js runtime code - API
// routes, server actions, server components. Middleware uses the separate,
// provider-less auth.config.ts instead. See middleware.ts.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;

        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminUsername || !adminPasswordHash) {
          console.error(
            "ADMIN_USERNAME or ADMIN_PASSWORD_HASH is not set in the environment."
          );
          return null;
        }

        if (username !== adminUsername) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, adminPasswordHash);
        if (!passwordMatches) {
          return null;
        }

        return { id: "admin", name: adminUsername };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

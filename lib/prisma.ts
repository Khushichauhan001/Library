import { PrismaClient } from "@prisma/client";

// Standard Prisma Client using a pooled Postgres connection string
// (e.g. Neon's pooled connection string, or Supabase's "Transaction" pooler
// connection string). This avoids opening a new long-lived connection per
// serverless function invocation, which is important on Vercel's free tier.
//
// The global cache prevents creating a new PrismaClient on every hot reload
// in development, which would otherwise exhaust the connection pool.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

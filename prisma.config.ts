import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 6+ config file (replaces the deprecated package.json#prisma block).
// Next.js loads .env automatically at runtime, but the Prisma CLI does not
// when a prisma.config.ts is present, so we load it explicitly here -
// otherwise `prisma migrate`/`generate`/`db seed` can't see DATABASE_URL.
// See: https://pris.ly/prisma-config
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

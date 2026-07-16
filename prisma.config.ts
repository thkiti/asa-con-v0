import "dotenv/config"
import { defineConfig } from "prisma/config"
import { resolvePrismaCliDatasourceUrl } from "./lib/shared/env"

/**
 * Prisma 7 CLI datasource (migrate / db push / db execute).
 * Prefer DIRECT_URL (direct Postgres). Fall back to DATABASE_URL for local convenience.
 * Placeholder allows `prisma generate` without a live database.
 *
 * Runtime Next.js clients use DATABASE_URL via lib/shared/prisma.ts — not this file.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolvePrismaCliDatasourceUrl(),
  },
})

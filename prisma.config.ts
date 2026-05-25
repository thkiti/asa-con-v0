import "dotenv/config"
import { defineConfig, env } from "prisma/config"

/** Prisma 7: DATABASE_URL lives here (not in schema.prisma). */
function databaseUrl(): string {
  try {
    return env("DATABASE_URL")
  } catch {
    // Allows `prisma generate` without a live database
    return "postgresql://127.0.0.1:5432/asa_con_v0?schema=public"
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
})
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { resolveDirectOrDatabaseUrl } from "../lib/shared/env"

async function main() {
  // Prefer DIRECT_URL for migration inspection (avoid transaction pooler).
  const pool = new pg.Pool({
    connectionString: resolveDirectOrDatabaseUrl(),
    max: 1,
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const migrations = await prisma.$queryRaw<
    Array<{
      migration_name: string
      finished_at: Date | null
      rolled_back_at: Date | null
      started_at: Date
      logs: string | null
    }>
  >`
    SELECT migration_name, finished_at, rolled_back_at, started_at, logs
    FROM "_prisma_migrations"
    ORDER BY started_at DESC
    LIMIT 30
  `

  console.log("=== _prisma_migrations (latest 30) ===")
  for (const row of migrations) {
    const status = row.finished_at
      ? "applied"
      : row.rolled_back_at
        ? "rolled_back"
        : "FAILED/PENDING"
    console.log(
      `${row.migration_name} | ${status} | started=${row.started_at.toISOString()}`
    )
    if (row.logs && !row.finished_at) {
      console.log(`  logs: ${row.logs.slice(0, 300)}`)
    }
  }

  const enums = await prisma.$queryRaw<Array<{ enum_name: string }>>`
    SELECT typname AS enum_name
    FROM pg_type
    WHERE typname IN ('RevenueVoucherStatus', 'InvoiceVoucherStatus')
    ORDER BY typname
  `
  console.log("\n=== enums ===")
  console.log(enums.map((e) => e.enum_name).join(", ") || "(none)")

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'RevenueVoucher', 'RevenueVoucherLine',
        'InvoiceVoucher', 'InvoiceVoucherLine'
      )
    ORDER BY table_name
  `
  console.log("\n=== tables ===")
  console.log(tables.map((t) => t.table_name).join(", ") || "(none)")

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { resolveDirectOrDatabaseUrl } from "../lib/shared/env"
import pg from "pg"

const pool = new pg.Pool({
  connectionString: resolveDirectOrDatabaseUrl(),
  max: 1,
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const migrations = await prisma.$queryRaw<
    Array<{
      migration_name: string
      started_at: Date
      finished_at: Date | null
      rolled_back_at: Date | null
      applied_steps_count: number
      logs: string | null
    }>
  >`
    SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count,
           LEFT(COALESCE(logs, ''), 400) AS logs
    FROM "_prisma_migrations"
    ORDER BY started_at
  `

  console.log("=== _prisma_migrations ===")
  for (const row of migrations) {
    const status = row.finished_at
      ? "APPLIED"
      : row.rolled_back_at
        ? "ROLLED_BACK"
        : "FAILED/PENDING"
    console.log(
      `${status}\t${row.migration_name}\tsteps=${row.applied_steps_count}\tfinished=${row.finished_at ?? "null"}`
    )
    if (row.logs && !row.finished_at) {
      console.log(`  logs: ${row.logs}`)
    }
  }

  const docArchiveCols = await prisma.$queryRaw<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DocumentArchive'
    ORDER BY ordinal_position
  `

  console.log("\n=== DocumentArchive columns (live DB) ===")
  if (docArchiveCols.length === 0) {
    console.log("(table does not exist)")
  } else {
    for (const col of docArchiveCols) {
      console.log(`  ${col.column_name}\t${col.data_type}\tnullable=${col.is_nullable}`)
    }
  }

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

  const tableNames = new Set(tables.map((t) => t.table_name))
  const watch = [
    "DocumentArchive",
    "DocumentArchiveLink",
    "BankReconciliation",
    "CashReconciliation",
    "ManualJournalEntry",
    "GlAccount",
  ]

  console.log("\n=== Key table presence ===")
  for (const name of watch) {
    console.log(`${tableNames.has(name) ? "YES" : "NO "}\t${name}`)
  }

  const glCols = await prisma.$queryRaw<
    Array<{ column_name: string; udt_name: string }>
  >`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'GlAccount'
    ORDER BY ordinal_position
  `

  console.log("\n=== GlAccount columns (live DB) ===")
  for (const col of glCols) {
    console.log(`  ${col.column_name}\t${col.udt_name}`)
  }

  const mjeCols = await prisma.$queryRaw<
    Array<{ column_name: string; udt_name: string }>
  >`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ManualJournalEntry'
    ORDER BY ordinal_position
  `

  console.log("\n=== ManualJournalEntry columns (live DB) ===")
  for (const col of mjeCols) {
    console.log(`  ${col.column_name}\t${col.udt_name}`)
  }

  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `

  console.log("\n=== Public enums ===")
  console.log(enums.map((e) => e.typname).join(", "))

  const archiveCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "DocumentArchive"
  `
  const archiveWithEntity = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "DocumentArchive" WHERE "legalEntityId" IS NOT NULL
  `
  console.log("\n=== DocumentArchive data ===")
  console.log(`  rows: ${archiveCount[0]?.count ?? 0}`)
  console.log(`  rows with legalEntityId: ${archiveWithEntity[0]?.count ?? 0}`)

  const mjeIndexes = await prisma.$queryRaw<
    Array<{ indexname: string; indexdef: string }>
  >`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'ManualJournalEntry'
    ORDER BY indexname
  `
  console.log("\n=== ManualJournalEntry indexes ===")
  for (const idx of mjeIndexes) {
    console.log(`  ${idx.indexname}: ${idx.indexdef}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

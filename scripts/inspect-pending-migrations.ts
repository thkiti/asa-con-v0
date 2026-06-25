import "dotenv/config"
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const pending = [
    "20260622120000_receipt_layout_blocks",
    "20260622130000_receipt_sub_header_block",
    "20260622140000_receipt_block_bold",
    "20260623140000_thermal_info_block_style",
    "20260625120000_invoice_voucher",
  ]

  const recorded = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ANY(${pending})
  `
  console.log("=== pending migration records ===")
  for (const name of pending) {
    const row = recorded.find((r) => r.migration_name === name)
    console.log(`${name}: ${row ? (row.finished_at ? "applied" : "failed/pending") : "not recorded"}`)
  }

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name ILIKE '%receipt%' OR table_name ILIKE '%thermal%'
    ORDER BY table_name
  `
  console.log("\n=== receipt/thermal tables ===")
  console.log(tables.map((t) => t.table_name).join(", ") || "(none)")

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { resolveDirectOrDatabaseUrl } from "../lib/shared/env"

async function main() {
  const pool = new pg.Pool({
    connectionString: resolveDirectOrDatabaseUrl(),
    max: 1,
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ThermalDocumentLayout'
    ORDER BY column_name
  `
  console.log("ThermalDocumentLayout columns:")
  console.log(cols.map((c) => c.column_name).join(", "))

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

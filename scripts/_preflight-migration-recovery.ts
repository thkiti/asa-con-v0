import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is required")
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function main() {
  const archive = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "DocumentArchive"
  `
  const dupes = await prisma.$queryRaw<
    Array<{ legalEntityCode: string; entryNo: string; cnt: bigint }>
  >`
    SELECT "legalEntityCode", "entryNo", COUNT(*)::bigint AS cnt
    FROM "ManualJournalEntry"
    GROUP BY "legalEntityCode", "entryNo"
    HAVING COUNT(*) > 1
    LIMIT 10
  `

  const archiveCount = Number(archive[0]?.count ?? 0)
  console.log(`DocumentArchive rows: ${archiveCount}`)
  console.log(`MJE (legalEntityCode, entryNo) duplicate groups: ${dupes.length}`)
  if (dupes.length > 0) {
    console.log(JSON.stringify(dupes, null, 2))
    process.exit(1)
  }
  if (archiveCount !== 0) {
    process.exit(1)
  }
  console.log("PREFLIGHT_OK")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

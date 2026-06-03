import { prisma } from "@/lib/shared/prisma"

import type { ImportDb } from "./types"

export function createImportDb(db: ImportDb = prisma as unknown as ImportDb): ImportDb {
  return db
}

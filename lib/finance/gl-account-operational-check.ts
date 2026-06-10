import type { PrismaClient } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "./account-map"
import type { OperationalCodeCheck } from "./gl-account-import-types"

export type OperationalCheckPrisma = Pick<PrismaClient, "glAccount">

const OPERATIONAL_CODES = Object.values(DEFAULT_ACCOUNT_CODES)

export async function checkOperationalAccountCodes(
  prisma: OperationalCheckPrisma
): Promise<OperationalCodeCheck[]> {
  const accounts = await prisma.glAccount.findMany({
    where: {
      code: { in: [...OPERATIONAL_CODES] },
      deleted: false,
    },
    select: { code: true, isActive: true },
  })

  const byCode = new Map(accounts.map((a) => [a.code, a]))

  return OPERATIONAL_CODES.map((code) => {
    const row = byCode.get(code)
    return {
      code,
      found: row != null,
      isActive: row?.isActive ?? false,
    }
  })
}

export function operationalCodesWarnings(
  checks: OperationalCodeCheck[]
): string[] {
  const warnings: string[] = []
  for (const check of checks) {
    if (!check.found) {
      warnings.push(
        `Operational account code ${check.code} is missing — POS/stock posting may fail`
      )
    } else if (!check.isActive) {
      warnings.push(
        `Operational account code ${check.code} is inactive — POS/stock posting may fail`
      )
    }
  }
  return warnings
}

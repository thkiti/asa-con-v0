import {
  GlAccountReconciliationRole,
  type PrismaClient,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  formatReconciliationAccountLabel,
  type ReconciliationAccountRef,
} from "./reconciliation-account-config"

export type PeriodReconciliationAccountsPrisma = Pick<PrismaClient, "glAccount">

const accountSelect = {
  id: true,
  code: true,
  name: true,
} as const

function mapAccount(row: {
  id: string
  code: string
  name: string
}): ReconciliationAccountRef {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
  }
}

async function listReconciliationAccountsByRole(
  prisma: PeriodReconciliationAccountsPrisma,
  role: GlAccountReconciliationRole
): Promise<ReconciliationAccountRef[]> {
  const rows = await prisma.glAccount.findMany({
    where: {
      deleted: false,
      isActive: true,
      reconciliationRole: role,
    },
    select: accountSelect,
    orderBy: { code: "asc" },
  })

  return rows.map(mapAccount)
}

export type { ReconciliationAccountRef }
export { formatReconciliationAccountLabel }

export async function listBankReconciliationAccounts(
  prisma: PeriodReconciliationAccountsPrisma,
  _legalEntityCode?: DocumentEntityCode
): Promise<ReconciliationAccountRef[]> {
  return listReconciliationAccountsByRole(prisma, GlAccountReconciliationRole.BANK)
}

export async function listCashReconciliationAccounts(
  prisma: PeriodReconciliationAccountsPrisma,
  _legalEntityCode?: DocumentEntityCode
): Promise<ReconciliationAccountRef[]> {
  return listReconciliationAccountsByRole(prisma, GlAccountReconciliationRole.CASH)
}

export async function requireReconciliationGlAccount(
  prisma: PeriodReconciliationAccountsPrisma,
  input: {
    glAccountId?: string
    glAccountCode?: string
    expectedRole: GlAccountReconciliationRole
  }
): Promise<ReconciliationAccountRef> {
  const glAccountId = input.glAccountId?.trim() ?? ""
  const glAccountCode = input.glAccountCode?.trim() ?? ""

  if (!glAccountId && !glAccountCode) {
    throw new Error("glAccountId or glAccountCode is required")
  }

  const row = await prisma.glAccount.findFirst({
    where: {
      deleted: false,
      isActive: true,
      ...(glAccountId ? { id: glAccountId } : { code: glAccountCode }),
    },
    select: {
      ...accountSelect,
      reconciliationRole: true,
    },
  })

  if (!row) {
    throw new Error("GL account not found")
  }

  if (row.reconciliationRole !== input.expectedRole) {
    const roleLabel =
      input.expectedRole === GlAccountReconciliationRole.BANK ? "bank" : "cash"
    throw new Error(`GL account ${row.code} is not configured for ${roleLabel} reconciliation`)
  }

  return mapAccount(row)
}

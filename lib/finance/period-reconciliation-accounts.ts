import {
  GlAccountReconciliationRole,
  type PrismaClient,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  formatReconciliationAccountLabel,
  type ReconciliationAccountRef,
} from "./reconciliation-account-config"

export type PeriodReconciliationAccountsPrisma = Pick<
  PrismaClient,
  "glAccount" | "bankAccount"
>

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
  legalEntityCode: DocumentEntityCode
): Promise<ReconciliationAccountRef[]> {
  const entity = legalEntityCode.trim()
  if (!entity) {
    throw new Error("legalEntityCode is required")
  }

  const rows = await prisma.bankAccount.findMany({
    where: {
      legalEntityCode: entity,
      isActive: true,
      glAccount: {
        deleted: false,
        isActive: true,
        reconciliationRole: GlAccountReconciliationRole.BANK,
      },
    },
    select: {
      glAccount: {
        select: accountSelect,
      },
    },
    orderBy: { glAccount: { code: "asc" } },
  })

  const seen = new Set<string>()
  const accounts: ReconciliationAccountRef[] = []
  for (const row of rows) {
    if (seen.has(row.glAccount.id)) continue
    seen.add(row.glAccount.id)
    accounts.push(mapAccount(row.glAccount))
  }

  return accounts
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

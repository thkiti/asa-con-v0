import { GlAccountReconciliationRole, type Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { createBankAccount } from "@/lib/finance/bank-account/bank-account-save"
import { listBankReconciliationAccounts } from "@/lib/finance/period-reconciliation-accounts"
import { prisma } from "@/lib/shared/prisma"

export const ASAS_BANK_ACCOUNT_MASTER_TARGETS = [
  {
    legalEntityCode: "AS",
    bankName: "Bangkok Bank",
    accountNumber: "2193020274",
    accountName: "Bangkok Bank Current",
    glAccountCode: "1021002",
  },
  {
    legalEntityCode: "AS",
    bankName: "Bangkok Bank",
    accountNumber: "2190280806",
    accountName: "Bangkok Bank Savings",
    glAccountCode: "1021003",
  },
] as const satisfies ReadonlyArray<{
  legalEntityCode: DocumentEntityCode
  bankName: string
  accountNumber: string
  accountName: string
  glAccountCode: string
}>

export const AD_PROTECTED_BANK_ACCOUNT_NUMBER = "2193020266"
export const AD_PROTECTED_GL_ACCOUNT_CODE = "1021001"

export class BootstrapAsasBankAccountMastersError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "BootstrapAsasBankAccountMastersError"
    this.code = code
  }
}

export type AsasBankAccountMasterTargetPlan = {
  accountNumber: string
  accountName: string
  glAccountCode: string
  glAccountId: string | null
  glAccountName: string | null
  exists: boolean
  existingId: string | null
  willCreate: boolean
}

export type BootstrapAsasBankAccountMastersPlan = {
  targets: AsasBankAccountMasterTargetPlan[]
  adProtectedAccount: {
    accountNumber: string
    exists: boolean
    legalEntityCode: string | null
    glAccountCode: string | null
    willTouch: false
  }
  willCreateCount: number
}

export type BootstrapAsasBankAccountMastersVerifyResult = {
  adBankAccount: {
    accountNumber: string
    legalEntityCode: string | null
    glAccountCode: string | null
    isActive: boolean | null
  }
  asBankAccounts: Array<{
    accountNumber: string
    glAccountCode: string
    isActive: boolean
  }>
  adReconciliationGlCodes: string[]
  asReconciliationGlCodes: string[]
  checks: Array<{ id: string; passed: boolean; detail: string }>
}

async function loadGlAccountByCode(
  tx: Prisma.TransactionClient,
  code: string
): Promise<{ id: string; code: string; name: string; reconciliationRole: string } | null> {
  return tx.glAccount.findFirst({
    where: {
      deleted: false,
      isActive: true,
      code,
    },
    select: {
      id: true,
      code: true,
      name: true,
      reconciliationRole: true,
    },
  })
}

export async function planBootstrapAsasBankAccountMasters(
  tx: Prisma.TransactionClient = prisma
): Promise<BootstrapAsasBankAccountMastersPlan> {
  const targets: AsasBankAccountMasterTargetPlan[] = []

  for (const target of ASAS_BANK_ACCOUNT_MASTER_TARGETS) {
    const glAccount = await loadGlAccountByCode(tx, target.glAccountCode)
    const existing = await tx.bankAccount.findUnique({
      where: {
        legalEntityCode_accountNumber: {
          legalEntityCode: target.legalEntityCode,
          accountNumber: target.accountNumber,
        },
      },
      select: { id: true },
    })

    targets.push({
      accountNumber: target.accountNumber,
      accountName: target.accountName,
      glAccountCode: target.glAccountCode,
      glAccountId: glAccount?.id ?? null,
      glAccountName: glAccount?.name ?? null,
      exists: existing != null,
      existingId: existing?.id ?? null,
      willCreate: existing == null && glAccount != null,
    })
  }

  const adProtected = await tx.bankAccount.findUnique({
    where: {
      legalEntityCode_accountNumber: {
        legalEntityCode: "AD",
        accountNumber: AD_PROTECTED_BANK_ACCOUNT_NUMBER,
      },
    },
    select: {
      legalEntityCode: true,
      glAccount: { select: { code: true } },
    },
  })

  return {
    targets,
    adProtectedAccount: {
      accountNumber: AD_PROTECTED_BANK_ACCOUNT_NUMBER,
      exists: adProtected != null,
      legalEntityCode: adProtected?.legalEntityCode ?? null,
      glAccountCode: adProtected?.glAccount.code ?? null,
      willTouch: false,
    },
    willCreateCount: targets.filter((row) => row.willCreate).length,
  }
}

function assertPlanCanExecute(plan: BootstrapAsasBankAccountMastersPlan): void {
  for (const target of plan.targets) {
    if (!target.glAccountId) {
      throw new BootstrapAsasBankAccountMastersError(
        `GL account ${target.glAccountCode} not found for AS bank account ${target.accountNumber}`,
        "GL_ACCOUNT_NOT_FOUND"
      )
    }
  }
}

export type ExecuteBootstrapAsasBankAccountMastersResult = {
  created: Array<{ accountNumber: string; id: string; glAccountCode: string }>
  skipped: Array<{ accountNumber: string; id: string }>
}

export async function executeBootstrapAsasBankAccountMasters(): Promise<ExecuteBootstrapAsasBankAccountMastersResult> {
  return prisma.$transaction(async (tx) => {
    const plan = await planBootstrapAsasBankAccountMasters(tx)
    assertPlanCanExecute(plan)

    const created: ExecuteBootstrapAsasBankAccountMastersResult["created"] = []
    const skipped: ExecuteBootstrapAsasBankAccountMastersResult["skipped"] = []

    for (const target of ASAS_BANK_ACCOUNT_MASTER_TARGETS) {
      const planRow = plan.targets.find((row) => row.accountNumber === target.accountNumber)
      if (!planRow) continue

      if (planRow.exists && planRow.existingId) {
        skipped.push({ accountNumber: target.accountNumber, id: planRow.existingId })
        continue
      }

      const row = await createBankAccount(tx, {
        legalEntityCode: target.legalEntityCode,
        bankName: target.bankName,
        accountNumber: target.accountNumber,
        accountName: target.accountName,
        glAccountCode: target.glAccountCode,
        isActive: true,
      })

      created.push({
        accountNumber: target.accountNumber,
        id: row.id,
        glAccountCode: row.glAccount.code,
      })
    }

    return { created, skipped }
  })
}

export async function verifyBootstrapAsasBankAccountMasters(): Promise<BootstrapAsasBankAccountMastersVerifyResult> {
  const adBankAccount = await prisma.bankAccount.findUnique({
    where: {
      legalEntityCode_accountNumber: {
        legalEntityCode: "AD",
        accountNumber: AD_PROTECTED_BANK_ACCOUNT_NUMBER,
      },
    },
    select: {
      legalEntityCode: true,
      isActive: true,
      glAccount: { select: { code: true } },
    },
  })

  const asBankAccounts = await prisma.bankAccount.findMany({
    where: {
      legalEntityCode: "AS",
      accountNumber: {
        in: ASAS_BANK_ACCOUNT_MASTER_TARGETS.map((target) => target.accountNumber),
      },
    },
    select: {
      accountNumber: true,
      isActive: true,
      glAccount: { select: { code: true } },
    },
    orderBy: { accountNumber: "asc" },
  })

  const adReconciliationGlCodes = (
    await listBankReconciliationAccounts(prisma, "AD")
  ).map((account) => account.code)
  const asReconciliationGlCodes = (
    await listBankReconciliationAccounts(prisma, "AS")
  ).map((account) => account.code)

  const checks: BootstrapAsasBankAccountMastersVerifyResult["checks"] = []

  checks.push({
    id: "ad-protected-account-exists",
    passed: adBankAccount != null,
    detail: adBankAccount
      ? `AD ${AD_PROTECTED_BANK_ACCOUNT_NUMBER} present`
      : `AD ${AD_PROTECTED_BANK_ACCOUNT_NUMBER} missing`,
  })

  checks.push({
    id: "ad-protected-gl-link",
    passed: adBankAccount?.glAccount.code === AD_PROTECTED_GL_ACCOUNT_CODE,
    detail: adBankAccount
      ? `AD account links to GL ${adBankAccount.glAccount.code}`
      : "AD protected account missing",
  })

  for (const target of ASAS_BANK_ACCOUNT_MASTER_TARGETS) {
    const row = asBankAccounts.find((account) => account.accountNumber === target.accountNumber)
    checks.push({
      id: `as-account-${target.accountNumber}`,
      passed: row != null && row.isActive,
      detail: row
        ? `AS ${target.accountNumber} active`
        : `AS ${target.accountNumber} missing or inactive`,
    })
    checks.push({
      id: `as-gl-${target.accountNumber}`,
      passed: row?.glAccount.code === target.glAccountCode,
      detail: row
        ? `AS ${target.accountNumber} links to GL ${row.glAccount.code}`
        : `AS ${target.accountNumber} not linked`,
    })
  }

  checks.push({
    id: "ad-readiness-gl-scope",
    passed:
      adReconciliationGlCodes.length === 1 &&
      adReconciliationGlCodes[0] === AD_PROTECTED_GL_ACCOUNT_CODE,
    detail: `AD readiness GL codes: ${adReconciliationGlCodes.join(", ") || "(none)"}`,
  })

  checks.push({
    id: "as-readiness-gl-scope",
    passed:
      asReconciliationGlCodes.length === 2 &&
      asReconciliationGlCodes.includes("1021002") &&
      asReconciliationGlCodes.includes("1021003") &&
      !asReconciliationGlCodes.includes(AD_PROTECTED_GL_ACCOUNT_CODE),
    detail: `AS readiness GL codes: ${asReconciliationGlCodes.join(", ") || "(none)"}`,
  })

  checks.push({
    id: "no-parent-1021-without-link",
    passed:
      !adReconciliationGlCodes.includes("1021") && !asReconciliationGlCodes.includes("1021"),
    detail: "Parent GL 1021 excluded unless directly linked by BankAccount",
  })

  return {
    adBankAccount: {
      accountNumber: AD_PROTECTED_BANK_ACCOUNT_NUMBER,
      legalEntityCode: adBankAccount?.legalEntityCode ?? null,
      glAccountCode: adBankAccount?.glAccount.code ?? null,
      isActive: adBankAccount?.isActive ?? null,
    },
    asBankAccounts: asBankAccounts.map((row) => ({
      accountNumber: row.accountNumber,
      glAccountCode: row.glAccount.code,
      isActive: row.isActive,
    })),
    adReconciliationGlCodes,
    asReconciliationGlCodes,
    checks,
  }
}

export function formatBootstrapAsasBankAccountMastersPlan(
  plan: BootstrapAsasBankAccountMastersPlan
): string {
  const lines = [
    "AS bank account master bootstrap plan",
    `  willCreateCount: ${plan.willCreateCount}`,
    "  targets:",
    ...plan.targets.map(
      (target) =>
        `    ${target.accountNumber} (${target.accountName}) -> GL ${target.glAccountCode}` +
        ` | exists=${target.exists} willCreate=${target.willCreate}` +
        (target.glAccountId ? "" : " | GL MISSING")
    ),
    "  AD protected (will not touch):",
    `    ${plan.adProtectedAccount.accountNumber}` +
      ` exists=${plan.adProtectedAccount.exists}` +
      ` entity=${plan.adProtectedAccount.legalEntityCode ?? "(none)"}` +
      ` gl=${plan.adProtectedAccount.glAccountCode ?? "(none)"}`,
  ]
  return lines.join("\n")
}

export function formatBootstrapAsasBankAccountMastersVerify(
  result: BootstrapAsasBankAccountMastersVerifyResult
): string {
  const lines = [
    "AS bank account master bootstrap verification",
    `  AD ${result.adBankAccount.accountNumber}: entity=${result.adBankAccount.legalEntityCode ?? "(none)"} gl=${result.adBankAccount.glAccountCode ?? "(none)"} active=${result.adBankAccount.isActive ?? "(none)"}`,
    `  AS accounts: ${result.asBankAccounts.map((row) => `${row.accountNumber}->${row.glAccountCode}`).join(", ") || "(none)"}`,
    `  AD readiness GL: ${result.adReconciliationGlCodes.join(", ") || "(none)"}`,
    `  AS readiness GL: ${result.asReconciliationGlCodes.join(", ") || "(none)"}`,
    "  checks:",
    ...result.checks.map(
      (check) => `    ${check.passed ? "PASS" : "FAIL"} — ${check.id}: ${check.detail}`
    ),
  ]
  return lines.join("\n")
}

export function assertBootstrapAsasBankAccountMastersVerifyPassed(
  result: BootstrapAsasBankAccountMastersVerifyResult
): void {
  const failed = result.checks.filter((check) => !check.passed)
  if (failed.length > 0) {
    throw new BootstrapAsasBankAccountMastersError(
      `Verification failed: ${failed.map((check) => check.id).join(", ")}`,
      "VERIFY_FAILED"
    )
  }
}

export async function assertTargetGlAccountsAreBankRole(
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  for (const target of ASAS_BANK_ACCOUNT_MASTER_TARGETS) {
    const glAccount = await loadGlAccountByCode(tx, target.glAccountCode)
    if (!glAccount) {
      throw new BootstrapAsasBankAccountMastersError(
        `GL account ${target.glAccountCode} not found`,
        "GL_ACCOUNT_NOT_FOUND"
      )
    }
    if (glAccount.reconciliationRole !== GlAccountReconciliationRole.BANK) {
      throw new BootstrapAsasBankAccountMastersError(
        `GL account ${target.glAccountCode} is not configured for bank reconciliation`,
        "GL_NOT_BANK_ROLE"
      )
    }
  }
}

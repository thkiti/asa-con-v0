import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { toMoney, ZERO } from "./decimal"
import { isOpeningBalancePeriodKey } from "./opening-balance-period"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
  type ReconciliationAccountRef,
} from "./period-reconciliation-accounts"
import {
  isPeriodReconciliationComplete,
  type PeriodReconciliationStatus,
} from "./period-reconciliation-types"

export type PeriodReconciliationRecordSummary = {
  id: string
  status: PeriodReconciliationStatus
  variance: string
  evidenceNote: string | null
  glAccountCode: string
  branchId: string | null
}

export type PeriodReconciliationReadinessGroup = {
  required: boolean
  configuredAccounts: ReconciliationAccountRef[]
  records: PeriodReconciliationRecordSummary[]
  completed: boolean
  missingWorksheetAccountCodes: string[]
  incompleteWorksheetAccountCodes: string[]
  unresolvedVarianceCount: number
  missingEvidenceCount: number
}

export type PeriodReconciliationReadinessSummary = {
  applies: boolean
  bank: PeriodReconciliationReadinessGroup
  cash: PeriodReconciliationReadinessGroup
}

export type PeriodReconciliationReadinessPrisma = Pick<
  PrismaClient,
  "bankReconciliation" | "cashReconciliation" | "glAccount"
>

function hasUnresolvedVariance(variance: string): boolean {
  return !toMoney(variance).eq(ZERO)
}

function hasEvidence(evidenceNote: string | null): boolean {
  return Boolean(evidenceNote?.trim())
}

function findRecordForAccount(
  records: PeriodReconciliationRecordSummary[],
  accountCode: string
): PeriodReconciliationRecordSummary | undefined {
  return records.find((record) => record.glAccountCode === accountCode)
}

function assessConfiguredAccountReadiness(
  configuredAccounts: ReconciliationAccountRef[],
  records: PeriodReconciliationRecordSummary[]
): Pick<
  PeriodReconciliationReadinessGroup,
  | "completed"
  | "missingWorksheetAccountCodes"
  | "incompleteWorksheetAccountCodes"
  | "unresolvedVarianceCount"
  | "missingEvidenceCount"
> {
  const missingWorksheetAccountCodes: string[] = []
  const incompleteWorksheetAccountCodes: string[] = []
  let unresolvedVarianceCount = 0
  let missingEvidenceCount = 0
  let completeCount = 0

  for (const account of configuredAccounts) {
    const record = findRecordForAccount(records, account.code)
    if (!record) {
      missingWorksheetAccountCodes.push(account.code)
      continue
    }

    if (isPeriodReconciliationComplete(record.status)) {
      completeCount += 1
    } else {
      incompleteWorksheetAccountCodes.push(account.code)
    }

    if (hasUnresolvedVariance(record.variance)) {
      unresolvedVarianceCount += 1
    }
    if (!hasEvidence(record.evidenceNote)) {
      missingEvidenceCount += 1
    }
  }

  return {
    completed:
      configuredAccounts.length > 0 &&
      completeCount === configuredAccounts.length &&
      missingWorksheetAccountCodes.length === 0,
    missingWorksheetAccountCodes,
    incompleteWorksheetAccountCodes,
    unresolvedVarianceCount,
    missingEvidenceCount,
  }
}

function filterRecordsForConfiguredAccounts(
  records: PeriodReconciliationRecordSummary[],
  configuredAccounts: ReconciliationAccountRef[]
): PeriodReconciliationRecordSummary[] {
  const configuredCodes = new Set(configuredAccounts.map((account) => account.code))
  return records.filter((record) => configuredCodes.has(record.glAccountCode))
}

export async function loadPeriodReconciliationReadinessSummary(
  prisma: PeriodReconciliationReadinessPrisma,
  input: {
    legalEntityCode: DocumentEntityCode
    periodKey: string
    branchId?: string
  }
): Promise<PeriodReconciliationReadinessSummary> {
  const emptyGroup = (): PeriodReconciliationReadinessGroup => ({
    required: false,
    configuredAccounts: [],
    records: [],
    completed: true,
    missingWorksheetAccountCodes: [],
    incompleteWorksheetAccountCodes: [],
    unresolvedVarianceCount: 0,
    missingEvidenceCount: 0,
  })

  if (isOpeningBalancePeriodKey(input.periodKey)) {
    return {
      applies: false,
      bank: emptyGroup(),
      cash: emptyGroup(),
    }
  }

  const branchId = input.branchId?.trim() || undefined

  const [configuredBankAccounts, configuredCashAccounts, bankRows, cashRows] =
    await Promise.all([
      listBankReconciliationAccounts(prisma, input.legalEntityCode),
      listCashReconciliationAccounts(prisma, input.legalEntityCode),
      prisma.bankReconciliation.findMany({
        where: {
          legalEntityCode: input.legalEntityCode,
          periodKey: input.periodKey,
        },
        include: { glAccount: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cashReconciliation.findMany({
        where: {
          legalEntityCode: input.legalEntityCode,
          periodKey: input.periodKey,
          ...(branchId ? { branchId } : {}),
        },
        include: { glAccount: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ])

  const bankRecords: PeriodReconciliationRecordSummary[] = bankRows.map((row) => ({
    id: row.id,
    status: row.status,
    variance: row.variance.toFixed(2),
    evidenceNote: row.evidenceNote,
    glAccountCode: row.glAccount.code,
    branchId: row.branchId,
  }))

  const cashRecords: PeriodReconciliationRecordSummary[] = cashRows.map((row) => ({
    id: row.id,
    status: row.status,
    variance: row.variance.toFixed(2),
    evidenceNote: row.evidenceNote,
    glAccountCode: row.glAccount.code,
    branchId: row.branchId,
  }))

  const bankScopedRecords = filterRecordsForConfiguredAccounts(
    bankRecords,
    configuredBankAccounts
  )
  const cashScopedRecords = filterRecordsForConfiguredAccounts(
    cashRecords,
    configuredCashAccounts
  )

  const bankAssessment = assessConfiguredAccountReadiness(
    configuredBankAccounts,
    bankScopedRecords
  )
  const cashAssessment = assessConfiguredAccountReadiness(
    configuredCashAccounts,
    cashScopedRecords
  )

  return {
    applies: true,
    bank: {
      required: configuredBankAccounts.length > 0,
      configuredAccounts: configuredBankAccounts,
      records: bankScopedRecords,
      ...bankAssessment,
    },
    cash: {
      required: Boolean(branchId) && configuredCashAccounts.length > 0,
      configuredAccounts: configuredCashAccounts,
      records: cashScopedRecords,
      completed: branchId ? cashAssessment.completed : true,
      missingWorksheetAccountCodes: branchId
        ? cashAssessment.missingWorksheetAccountCodes
        : [],
      incompleteWorksheetAccountCodes: branchId
        ? cashAssessment.incompleteWorksheetAccountCodes
        : [],
      unresolvedVarianceCount: branchId ? cashAssessment.unresolvedVarianceCount : 0,
      missingEvidenceCount: branchId ? cashAssessment.missingEvidenceCount : 0,
    },
  }
}

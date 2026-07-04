import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  loadBankCashCheckReconciliationEvidenceForAccounts,
  type BankCashCheckReconciliationEvidence,
} from "./bank-cash-check"
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
  bankCashCheckEvidence: BankCashCheckReconciliationEvidence[]
  completedViaBankCashCheckAccountCodes: string[]
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
  | "bankReconciliation"
  | "cashReconciliation"
  | "glAccount"
  | "bankAccount"
  | "bankStatement"
  | "bankStatementLine"
  | "journalEntryLine"
  | "accountingPeriod"
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
  records: PeriodReconciliationRecordSummary[],
  bankCashCheckEvidence: BankCashCheckReconciliationEvidence[]
): Pick<
  PeriodReconciliationReadinessGroup,
  | "completed"
  | "completedViaBankCashCheckAccountCodes"
  | "missingWorksheetAccountCodes"
  | "incompleteWorksheetAccountCodes"
  | "unresolvedVarianceCount"
  | "missingEvidenceCount"
> {
  const evidenceByCode = new Map(
    bankCashCheckEvidence.map((evidence) => [evidence.glAccountCode, evidence])
  )
  const missingWorksheetAccountCodes: string[] = []
  const incompleteWorksheetAccountCodes: string[] = []
  const completedViaBankCashCheckAccountCodes: string[] = []
  let unresolvedVarianceCount = 0
  let missingEvidenceCount = 0
  let completeCount = 0

  for (const account of configuredAccounts) {
    const record = findRecordForAccount(records, account.code)
    const evidence = evidenceByCode.get(account.code)
    const worksheetComplete = Boolean(record && isPeriodReconciliationComplete(record.status))
    const cashCheckComplete = evidence?.complete === true

    if (cashCheckComplete) {
      completedViaBankCashCheckAccountCodes.push(account.code)
    }

    if (!record && !evidence?.statementId) {
      missingWorksheetAccountCodes.push(account.code)
      continue
    }

    if (worksheetComplete || cashCheckComplete) {
      completeCount += 1
    } else {
      incompleteWorksheetAccountCodes.push(account.code)
    }

    const variance = record?.variance ?? evidence?.variance ?? "0.00"
    if (hasUnresolvedVariance(variance)) {
      unresolvedVarianceCount += 1
    }

    if (!hasEvidence(record?.evidenceNote ?? null) && !cashCheckComplete) {
      missingEvidenceCount += 1
    }
  }

  return {
    completed:
      configuredAccounts.length > 0 &&
      completeCount === configuredAccounts.length &&
      missingWorksheetAccountCodes.length === 0,
    completedViaBankCashCheckAccountCodes,
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
    bankCashCheckEvidence: [],
    completedViaBankCashCheckAccountCodes: [],
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

  const bankCashCheckEvidence = await loadBankCashCheckReconciliationEvidenceForAccounts(
    prisma,
    {
      legalEntityCode: input.legalEntityCode,
      periodKey: input.periodKey,
      accounts: configuredBankAccounts,
    }
  )

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
    bankScopedRecords,
    bankCashCheckEvidence
  )
  const cashAssessment = assessConfiguredAccountReadiness(
    configuredCashAccounts,
    cashScopedRecords,
    []
  )

  return {
    applies: true,
    bank: {
      required: configuredBankAccounts.length > 0,
      configuredAccounts: configuredBankAccounts,
      records: bankScopedRecords,
      bankCashCheckEvidence,
      ...bankAssessment,
    },
    cash: {
      required: Boolean(branchId) && configuredCashAccounts.length > 0,
      configuredAccounts: configuredCashAccounts,
      records: cashScopedRecords,
      bankCashCheckEvidence: [],
      completed: branchId ? cashAssessment.completed : true,
      completedViaBankCashCheckAccountCodes: [],
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

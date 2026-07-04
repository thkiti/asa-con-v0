import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { getBankCashJournal } from "../bank-cash-journal/bank-cash-journal-read"
import { pickBankStatementWorkspaceRow } from "../bank-statement/bank-statement-workspace-pick"
import type { BankStatementLineRow, BankStatementStatus } from "../bank-statement/bank-statement-types"
import { getBankStatementById, listBankStatements } from "../bank-statement/bank-statement-read"
import {
  matchStatementLinesToJournal,
  type AmountMatchLine,
} from "../bank-statement-match"
import { computeBankReconciliationAmounts } from "../period-reconciliation-compute"
import { roundMoney, toMoney, ZERO } from "../decimal"

export type BankCashCheckReconciliationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "VARIANCE"

export type BankCashCheckReconciliationEvidence = {
  glAccountId: string
  glAccountCode: string
  bankAccountId: string | null
  bankAccountLabel: string | null
  statementId: string | null
  statementNo: string | null
  statementStatus: BankStatementStatus | null
  statementEndingBalance: string
  bookEndingBalance: string
  outstandingDeposits: string
  outstandingCheques: string
  variance: string
  status: BankCashCheckReconciliationStatus
  complete: boolean
}

export type BankCashCheckEvidencePrisma = Pick<
  PrismaClient,
  | "bankAccount"
  | "bankStatement"
  | "bankStatementLine"
  | "glAccount"
  | "journalEntryLine"
  | "accountingPeriod"
>

function lineHasAmount(line: BankStatementLineRow): boolean {
  const deposit = toMoney(line.depositAmount ?? ZERO)
  const withdrawal = toMoney(line.withdrawalAmount ?? ZERO)
  return deposit.gt(ZERO) || withdrawal.gt(ZERO)
}

function mapStatementLinesToMatchLines(lines: BankStatementLineRow[]): AmountMatchLine[] {
  return lines.filter(lineHasAmount).map((line) => ({
    id: line.id,
    depositAmount: line.depositAmount ?? "0.00",
    withdrawalAmount: line.withdrawalAmount ?? "0.00",
  }))
}

function sumUnmatchedJournalSide(
  lines: AmountMatchLine[],
  unmatchedIds: readonly string[],
  side: "deposit" | "withdrawal"
): string {
  const idSet = new Set(unmatchedIds)
  let total = toMoney(ZERO)

  for (const line of lines) {
    if (!idSet.has(line.id)) continue
    const amount = side === "deposit" ? line.depositAmount : line.withdrawalAmount
    total = total.plus(toMoney(amount))
  }

  return roundMoney(total).toFixed(2)
}

export function resolveBankCashCheckReconciliationStatus(input: {
  hasStatement: boolean
  statementStatus: BankStatementStatus | null
  variance: string
}): BankCashCheckReconciliationStatus {
  if (!input.hasStatement) return "NOT_STARTED"
  if (input.statementStatus !== "READY") return "IN_PROGRESS"
  if (!toMoney(input.variance).eq(ZERO)) return "VARIANCE"
  return "COMPLETE"
}

export function buildBankCashCheckReconciliationEvidence(input: {
  glAccountId: string
  glAccountCode: string
  bankAccountId: string | null
  bankAccountLabel: string | null
  statementId: string | null
  statementNo: string | null
  statementStatus: BankStatementStatus | null
  statementEndingBalance: string
  bookEndingBalance: string
  outstandingDeposits: string
  outstandingCheques: string
}): BankCashCheckReconciliationEvidence {
  const { variance } = computeBankReconciliationAmounts({
    glBalance: input.bookEndingBalance,
    bankStatementBalance: input.statementEndingBalance,
    outstandingDeposits: input.outstandingDeposits,
    outstandingPayments: input.outstandingCheques,
  })

  const status = resolveBankCashCheckReconciliationStatus({
    hasStatement: Boolean(input.statementId),
    statementStatus: input.statementStatus,
    variance,
  })

  return {
    glAccountId: input.glAccountId,
    glAccountCode: input.glAccountCode,
    bankAccountId: input.bankAccountId,
    bankAccountLabel: input.bankAccountLabel,
    statementId: input.statementId,
    statementNo: input.statementNo,
    statementStatus: input.statementStatus,
    statementEndingBalance: input.statementEndingBalance,
    bookEndingBalance: input.bookEndingBalance,
    outstandingDeposits: input.outstandingDeposits,
    outstandingCheques: input.outstandingCheques,
    variance,
    status,
    complete: status === "COMPLETE",
  }
}

function formatBankAccountLabel(input: {
  bankName: string
  accountNumber: string
}): string {
  return `${input.bankName} ${input.accountNumber}`.trim()
}

export async function loadBankCashCheckReconciliationEvidence(
  prisma: BankCashCheckEvidencePrisma,
  input: {
    legalEntityCode: DocumentEntityCode
    periodKey: string
    glAccountId: string
    glAccountCode: string
  }
): Promise<BankCashCheckReconciliationEvidence> {
  const glAccountId = input.glAccountId.trim()
  const periodKey = input.periodKey.trim()

  const bankAccount = await prisma.bankAccount.findFirst({
    where: {
      legalEntityCode: input.legalEntityCode,
      glAccountId,
      isActive: true,
    },
    orderBy: { accountNumber: "asc" },
  })

  if (!bankAccount) {
    return buildBankCashCheckReconciliationEvidence({
      glAccountId,
      glAccountCode: input.glAccountCode,
      bankAccountId: null,
      bankAccountLabel: null,
      statementId: null,
      statementNo: null,
      statementStatus: null,
      statementEndingBalance: "0.00",
      bookEndingBalance: "0.00",
      outstandingDeposits: "0.00",
      outstandingCheques: "0.00",
    })
  }

  const bankAccountLabel = formatBankAccountLabel(bankAccount)

  const journal = await getBankCashJournal(prisma, {
    legalEntityCode: input.legalEntityCode,
    periodKey,
    bankAccountId: bankAccount.id,
  })

  const bookEndingBalance = journal.endingBalance

  const statementList = await listBankStatements(prisma, {
    legalEntityCode: input.legalEntityCode,
    periodKey,
    bankAccountId: bankAccount.id,
  })

  const workspaceRow = pickBankStatementWorkspaceRow(statementList.items)
  if (!workspaceRow) {
    return buildBankCashCheckReconciliationEvidence({
      glAccountId,
      glAccountCode: input.glAccountCode,
      bankAccountId: bankAccount.id,
      bankAccountLabel,
      statementId: null,
      statementNo: null,
      statementStatus: null,
      statementEndingBalance: "0.00",
      bookEndingBalance,
      outstandingDeposits: "0.00",
      outstandingCheques: "0.00",
    })
  }

  const statement = await getBankStatementById(prisma, {
    id: workspaceRow.id,
    legalEntityCode: input.legalEntityCode,
  })

  const statementLines = mapStatementLinesToMatchLines(statement.lines ?? [])
  const journalLines = journal.lines.map((line) => ({
    id: line.journalLineId,
    depositAmount: line.depositAmount,
    withdrawalAmount: line.withdrawalAmount,
  }))

  const matchSummary = matchStatementLinesToJournal(statementLines, journalLines)
  const outstandingDeposits = sumUnmatchedJournalSide(
    journalLines,
    matchSummary.unmatchedJournalLineIds,
    "deposit"
  )
  const outstandingCheques = sumUnmatchedJournalSide(
    journalLines,
    matchSummary.unmatchedJournalLineIds,
    "withdrawal"
  )

  return buildBankCashCheckReconciliationEvidence({
    glAccountId,
    glAccountCode: input.glAccountCode,
    bankAccountId: bankAccount.id,
    bankAccountLabel,
    statementId: statement.id,
    statementNo: statement.statementNo,
    statementStatus: statement.status,
    statementEndingBalance: statement.closingBalance,
    bookEndingBalance,
    outstandingDeposits,
    outstandingCheques,
  })
}

export async function loadBankCashCheckReconciliationEvidenceForAccounts(
  prisma: BankCashCheckEvidencePrisma,
  input: {
    legalEntityCode: DocumentEntityCode
    periodKey: string
    accounts: readonly { id: string; code: string }[]
  }
): Promise<BankCashCheckReconciliationEvidence[]> {
  return Promise.all(
    input.accounts.map((account) =>
      loadBankCashCheckReconciliationEvidence(prisma, {
        legalEntityCode: input.legalEntityCode,
        periodKey: input.periodKey,
        glAccountId: account.id,
        glAccountCode: account.code,
      })
    )
  )
}

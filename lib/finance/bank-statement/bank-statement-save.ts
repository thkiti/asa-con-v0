import { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { BankStatementError, BankStatementErrorCodes } from "./bank-statement-errors"
import { getBankStatementById } from "./bank-statement-read"
import type {
  BankStatementLineInput,
  CreateBankStatementInput,
  UpdateBankStatementInput,
} from "./bank-statement-types"
import {
  isValidPeriodKey,
  normalizeChequeNumber,
  normalizePeriodKey,
  parseLineTransactionDate,
  parseStatementDate,
  formatDateOnly,
} from "./bank-statement-validate"

export type BankStatementSavePrisma = Pick<
  PrismaClient,
  "bankStatement" | "bankStatementLine" | "bankAccount" | "$transaction"
>

function parseMoney(value: string, field: string): Prisma.Decimal {
  const trimmed = value.trim().replace(/,/g, "")
  if (!trimmed || Number.isNaN(Number.parseFloat(trimmed))) {
    throw new BankStatementError(`${field} must be a valid amount`, BankStatementErrorCodes.VALIDATION)
  }
  return new Prisma.Decimal(trimmed)
}

function parseOptionalMoney(
  value: string | null | undefined,
  field: string
): Prisma.Decimal | null {
  if (value == null || value.trim() === "") return null
  return parseMoney(value, field)
}

function normalizeLines(
  lines: BankStatementLineInput[] | undefined,
  defaultTransactionDate?: string
): BankStatementLineInput[] {
  if (!lines?.length) return []

  return lines.map((line, index) => {
    const deposit = String(line.depositAmount ?? "").trim()
    const withdrawal = String(line.withdrawalAmount ?? "").trim()
    if (deposit && withdrawal) {
      throw new BankStatementError(
        `Line ${index + 1}: enter deposit or withdrawal, not both`,
        BankStatementErrorCodes.VALIDATION
      )
    }
    if (!deposit && !withdrawal) {
      throw new BankStatementError(
        `Line ${index + 1}: deposit or withdrawal is required`,
        BankStatementErrorCodes.VALIDATION
      )
    }

    const transactionDate =
      String(line.transactionDate ?? "").trim() || String(defaultTransactionDate ?? "").trim()
    if (!transactionDate) {
      throw new BankStatementError(
        `Line ${index + 1}: transaction date is required`,
        BankStatementErrorCodes.VALIDATION
      )
    }

    return {
      lineNo: line.lineNo ?? index + 1,
      transactionDate,
      description: String(line.description ?? "").trim(),
      chequeNumber: normalizeChequeNumber(line.chequeNumber),
      depositAmount: deposit || null,
      withdrawalAmount: withdrawal || null,
      runningBalance: String(line.runningBalance ?? "0"),
    }
  })
}

async function assertBankAccount(
  prisma: BankStatementSavePrisma,
  bankAccountId: string,
  legalEntityCode: string
) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, legalEntityCode, isActive: true },
    select: { id: true },
  })
  if (!account) {
    throw new BankStatementError(
      "Bank account not found for this legal entity",
      BankStatementErrorCodes.BANK_ACCOUNT_NOT_FOUND,
      404
    )
  }
}

async function nextStatementNo(
  prisma: BankStatementSavePrisma,
  legalEntityCode: string,
  periodKey: string
): Promise<string> {
  const rows = await prisma.bankStatement.findMany({
    where: { legalEntityCode, periodKey },
    select: { statementNo: true },
  })

  const pattern = new RegExp(`^BS-${periodKey}-(\\d+)$`)
  let maxSuffix = 0
  for (const row of rows) {
    const match = pattern.exec(row.statementNo)
    if (!match) continue
    const suffix = Number.parseInt(match[1]!, 10)
    if (Number.isFinite(suffix) && suffix > maxSuffix) {
      maxSuffix = suffix
    }
  }

  return `BS-${periodKey}-${String(maxSuffix + 1).padStart(3, "0")}`
}

async function replaceLines(
  tx: Pick<PrismaClient, "bankStatementLine">,
  bankStatementId: string,
  lines: BankStatementLineInput[]
) {
  await tx.bankStatementLine.deleteMany({ where: { bankStatementId } })

  if (lines.length === 0) return

  await tx.bankStatementLine.createMany({
    data: lines.map((line, index) => ({
      bankStatementId,
      lineNo: line.lineNo ?? index + 1,
      transactionDate: parseLineTransactionDate(line.transactionDate),
      description: line.description,
      chequeNumber: line.chequeNumber,
      depositAmount: parseOptionalMoney(line.depositAmount, "depositAmount"),
      withdrawalAmount: parseOptionalMoney(line.withdrawalAmount, "withdrawalAmount"),
      runningBalance: parseMoney(line.runningBalance, "runningBalance"),
    })),
  })
}

export async function createBankStatement(
  prisma: BankStatementSavePrisma,
  input: CreateBankStatementInput
) {
  const bankAccountId = input.bankAccountId.trim()
  const periodKey = normalizePeriodKey(input.periodKey)
  if (!isValidPeriodKey(periodKey)) {
    throw new BankStatementError("periodKey must be YYYY-MM", BankStatementErrorCodes.VALIDATION)
  }
  if (!bankAccountId) {
    throw new BankStatementError("bankAccountId is required", BankStatementErrorCodes.VALIDATION)
  }

  await assertBankAccount(prisma, bankAccountId, input.legalEntityCode)

  const statementNo =
    input.statementNo?.trim() ||
    (await nextStatementNo(prisma, input.legalEntityCode, periodKey))

  const duplicate = await prisma.bankStatement.findUnique({
    where: {
      legalEntityCode_statementNo: {
        legalEntityCode: input.legalEntityCode,
        statementNo,
      },
    },
    select: { id: true },
  })
  if (duplicate) {
    throw new BankStatementError(
      "Statement number already exists for this legal entity",
      BankStatementErrorCodes.DUPLICATE,
      409
    )
  }

  const lines = normalizeLines(input.lines, input.statementDate)

  const created = await prisma.bankStatement.create({
    data: {
      legalEntityCode: input.legalEntityCode,
      bankAccountId,
      periodKey,
      statementNo,
      statementDate: parseStatementDate(input.statementDate),
      openingBalance: parseMoney(input.openingBalance, "openingBalance"),
      closingBalance: parseMoney(input.closingBalance, "closingBalance"),
      status: input.status ?? "NEW",
      createdByStaffId: input.actorStaffId ?? null,
      updatedByStaffId: input.actorStaffId ?? null,
      lines: {
        create: lines.map((line, index) => ({
          lineNo: line.lineNo ?? index + 1,
          transactionDate: parseLineTransactionDate(line.transactionDate),
          description: line.description,
          chequeNumber: line.chequeNumber,
          depositAmount: parseOptionalMoney(line.depositAmount, "depositAmount"),
          withdrawalAmount: parseOptionalMoney(line.withdrawalAmount, "withdrawalAmount"),
          runningBalance: parseMoney(line.runningBalance, "runningBalance"),
        })),
      },
    },
    select: { id: true },
  })

  return getBankStatementById(prisma, {
    id: created.id,
    legalEntityCode: input.legalEntityCode,
  })
}

export async function updateBankStatement(
  prisma: BankStatementSavePrisma,
  input: UpdateBankStatementInput
) {
  const id = input.id.trim()
  if (!id) {
    throw new BankStatementError("id is required", BankStatementErrorCodes.VALIDATION)
  }

  const existing = await prisma.bankStatement.findFirst({
    where: { id, legalEntityCode: input.legalEntityCode },
    select: { id: true, status: true, statementNo: true, statementDate: true },
  })

  if (!existing) {
    throw new BankStatementError("Bank statement not found", BankStatementErrorCodes.NOT_FOUND, 404)
  }

  if (existing.status === "READY") {
    const unlocking = input.status === "DRAFT"
    const hasContentEdits =
      input.lines !== undefined ||
      input.bankAccountId !== undefined ||
      input.periodKey !== undefined ||
      input.statementNo !== undefined ||
      input.statementDate !== undefined ||
      input.openingBalance !== undefined ||
      input.closingBalance !== undefined ||
      (input.status !== undefined && input.status !== "DRAFT")

    if (hasContentEdits && !unlocking) {
      throw new BankStatementError(
        "Ready statements are read-only. Set status to Draft to edit.",
        BankStatementErrorCodes.READ_ONLY,
        409
      )
    }
  }

  const bankAccountId = input.bankAccountId?.trim()
  if (bankAccountId) {
    await assertBankAccount(prisma, bankAccountId, input.legalEntityCode)
  }

  const periodKey = input.periodKey !== undefined ? normalizePeriodKey(input.periodKey) : undefined
  if (periodKey !== undefined && !isValidPeriodKey(periodKey)) {
    throw new BankStatementError("periodKey must be YYYY-MM", BankStatementErrorCodes.VALIDATION)
  }

  const statementNo = input.statementNo?.trim()
  if (statementNo && statementNo !== existing.statementNo) {
    const duplicate = await prisma.bankStatement.findUnique({
      where: {
        legalEntityCode_statementNo: {
          legalEntityCode: input.legalEntityCode,
          statementNo,
        },
      },
      select: { id: true },
    })
    if (duplicate && duplicate.id !== id) {
      throw new BankStatementError(
        "Statement number already exists for this legal entity",
        BankStatementErrorCodes.DUPLICATE,
        409
      )
    }
  }

  const defaultTransactionDate =
    input.statementDate ?? formatDateOnly(existing.statementDate)
  const lines =
    input.lines !== undefined ? normalizeLines(input.lines, defaultTransactionDate) : undefined
  let nextStatus = input.status
  if (nextStatus === undefined && lines !== undefined && existing.status === "NEW") {
    nextStatus = "DRAFT"
  }

  return prisma.$transaction(async (tx) => {
    await tx.bankStatement.update({
      where: { id },
      data: {
        ...(bankAccountId ? { bankAccountId } : {}),
        ...(periodKey !== undefined ? { periodKey } : {}),
        ...(statementNo ? { statementNo } : {}),
        ...(input.statementDate !== undefined
          ? { statementDate: parseStatementDate(input.statementDate) }
          : {}),
        ...(input.openingBalance !== undefined
          ? { openingBalance: parseMoney(input.openingBalance, "openingBalance") }
          : {}),
        ...(input.closingBalance !== undefined
          ? { closingBalance: parseMoney(input.closingBalance, "closingBalance") }
          : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        updatedByStaffId: input.actorStaffId ?? null,
      },
    })

    if (lines !== undefined) {
      await replaceLines(tx, id, lines)
    }

    return getBankStatementById(tx, {
      id,
      legalEntityCode: input.legalEntityCode,
    })
  })
}

export async function deleteBankStatement(
  prisma: BankStatementSavePrisma,
  input: { id: string; legalEntityCode: string }
) {
  const id = input.id.trim()
  const existing = await prisma.bankStatement.findFirst({
    where: { id, legalEntityCode: input.legalEntityCode },
    select: { id: true, status: true },
  })

  if (!existing) {
    throw new BankStatementError("Bank statement not found", BankStatementErrorCodes.NOT_FOUND, 404)
  }

  if (existing.status === "READY") {
    throw new BankStatementError(
      "Ready statements cannot be deleted",
      BankStatementErrorCodes.READ_ONLY,
      409
    )
  }

  await prisma.bankStatement.delete({ where: { id } })
}

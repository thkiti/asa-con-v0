import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { BankStatementError, BankStatementErrorCodes } from "./bank-statement-errors"
import type {
  BankStatementDetail,
  BankStatementLineRow,
  BankStatementListFilter,
  BankStatementListResult,
  BankStatementRow,
} from "./bank-statement-types"
import { validateBankStatementBalances, formatDateOnly } from "./bank-statement-validate"

export type BankStatementReadPrisma = Pick<
  PrismaClient,
  "bankStatement" | "bankStatementLine"
>

const bankAccountSelect = {
  id: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  currencyCode: true,
  glAccount: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const

type BankStatementDbRow = Prisma.BankStatementGetPayload<{
  include: { bankAccount: { include: { glAccount: { select: { id: true; code: true; name: true } } } } }
}>

type BankStatementLineDbRow = Prisma.BankStatementLineGetPayload<object>

function mapLineRow(row: BankStatementLineDbRow): BankStatementLineRow {
  return {
    id: row.id,
    lineNo: row.lineNo,
    transactionDate: formatDateOnly(row.transactionDate),
    description: row.description,
    chequeNumber: row.chequeNumber,
    depositAmount: row.depositAmount != null ? row.depositAmount.toFixed(2) : null,
    withdrawalAmount:
      row.withdrawalAmount != null ? row.withdrawalAmount.toFixed(2) : null,
    runningBalance: row.runningBalance.toFixed(2),
  }
}

function mapRow(row: BankStatementDbRow): BankStatementRow {
  const legalEntityCode = parseDocumentEntityCode(row.legalEntityCode)
  if (!legalEntityCode) {
    throw new BankStatementError(
      `Invalid legal entity on bank statement ${row.id}`,
      BankStatementErrorCodes.VALIDATION
    )
  }

  return {
    id: row.id,
    legalEntityCode,
    bankAccountId: row.bankAccountId,
    bankAccount: {
      id: row.bankAccount.id,
      bankName: row.bankAccount.bankName,
      accountNumber: row.bankAccount.accountNumber,
      accountName: row.bankAccount.accountName,
      currencyCode: row.bankAccount.currencyCode,
      glAccount: row.bankAccount.glAccount,
    },
    periodKey: row.periodKey,
    statementNo: row.statementNo,
    statementDate: formatDateOnly(row.statementDate),
    openingBalance: row.openingBalance.toFixed(2),
    closingBalance: row.closingBalance.toFixed(2),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByStaffId: row.createdByStaffId,
    updatedByStaffId: row.updatedByStaffId,
  }
}

const listInclude = {
  bankAccount: {
    include: {
      glAccount: { select: { id: true, code: true, name: true } },
    },
  },
} as const

function buildSearchWhere(search: string | undefined): Prisma.BankStatementWhereInput {
  const query = search?.trim()
  if (!query) return {}

  return {
    OR: [
      { statementNo: { contains: query, mode: "insensitive" } },
      { bankAccount: { bankName: { contains: query, mode: "insensitive" } } },
      { bankAccount: { accountNumber: { contains: query.replace(/\D/g, ""), mode: "insensitive" } } },
      { bankAccount: { accountName: { contains: query, mode: "insensitive" } } },
    ],
  }
}

export async function listBankStatements(
  prisma: BankStatementReadPrisma,
  filter: BankStatementListFilter
): Promise<BankStatementListResult> {
  const where: Prisma.BankStatementWhereInput = {
    legalEntityCode: filter.legalEntityCode,
    ...(filter.periodKey ? { periodKey: filter.periodKey.trim() } : {}),
    ...(filter.bankAccountId ? { bankAccountId: filter.bankAccountId.trim() } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...buildSearchWhere(filter.search),
  }

  const [rows, total] = await Promise.all([
    prisma.bankStatement.findMany({
      where,
      include: listInclude,
      orderBy: [{ periodKey: "desc" }, { statementDate: "desc" }, { statementNo: "desc" }],
    }),
    prisma.bankStatement.count({ where }),
  ])

  return {
    items: rows.map(mapRow),
    total,
  }
}

export async function getBankStatementById(
  prisma: BankStatementReadPrisma,
  input: { id: string; legalEntityCode: DocumentEntityCode }
): Promise<BankStatementDetail> {
  const id = input.id.trim()
  if (!id) {
    throw new BankStatementError("id is required", BankStatementErrorCodes.VALIDATION)
  }

  const row = await prisma.bankStatement.findFirst({
    where: { id, legalEntityCode: input.legalEntityCode },
    include: {
      ...listInclude,
      lines: { orderBy: { lineNo: "asc" } },
    },
  })

  if (!row) {
    throw new BankStatementError("Bank statement not found", BankStatementErrorCodes.NOT_FOUND, 404)
  }

  const header = mapRow(row)
  const lines = row.lines.map(mapLineRow)
  const validation = validateBankStatementBalances({
    openingBalance: header.openingBalance,
    closingBalance: header.closingBalance,
    lines,
  })

  return { ...header, lines, validation }
}

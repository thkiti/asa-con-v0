import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { BankAccountError, BankAccountErrorCodes } from "./bank-account-errors"
import type {
  BankAccountListFilter,
  BankAccountListResult,
  BankAccountRow,
} from "./bank-account-types"

const bankAccountSelect = {
  id: true,
  legalEntityCode: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  currencyCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  glAccount: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const

function mapRow(
  row: {
    id: string
    legalEntityCode: string
    bankName: string
    accountNumber: string
    accountName: string
    currencyCode: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    glAccount: { id: string; code: string; name: string }
  }
): BankAccountRow {
  return {
    id: row.id,
    legalEntityCode: row.legalEntityCode as DocumentEntityCode,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    accountName: row.accountName,
    currencyCode: row.currencyCode,
    glAccount: row.glAccount,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type BankAccountReadPrisma = Pick<PrismaClient, "bankAccount">

function resolveActiveWhere(filter: BankAccountListFilter) {
  const activeFilter =
    filter.activeFilter ??
    (filter.activeOnly === false ? "all" : "active")

  if (activeFilter === "all") return {}
  return { isActive: activeFilter === "active" }
}

export async function listBankAccounts(
  prisma: BankAccountReadPrisma,
  filter: BankAccountListFilter
): Promise<BankAccountListResult> {
  const where = {
    legalEntityCode: filter.legalEntityCode,
    ...resolveActiveWhere(filter),
  }

  const [rows, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      select: bankAccountSelect,
      orderBy: [{ bankName: "asc" }, { accountNumber: "asc" }],
    }),
    prisma.bankAccount.count({ where }),
  ])

  return {
    items: rows.map(mapRow),
    total,
  }
}

export async function getBankAccountById(
  prisma: BankAccountReadPrisma,
  input: { id: string; legalEntityCode: DocumentEntityCode }
): Promise<BankAccountRow> {
  const id = input.id.trim()
  if (!id) {
    throw new BankAccountError("id is required", BankAccountErrorCodes.VALIDATION)
  }

  const row = await prisma.bankAccount.findFirst({
    where: { id, legalEntityCode: input.legalEntityCode },
    select: bankAccountSelect,
  })

  if (!row) {
    throw new BankAccountError("Bank account not found", BankAccountErrorCodes.NOT_FOUND, 404)
  }

  return mapRow(row)
}

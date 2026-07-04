import type { PrismaClient } from "@/generated/prisma/client"
import { BankAccountError, BankAccountErrorCodes } from "./bank-account-errors"
import { getBankAccountById } from "./bank-account-read"
import type { BankAccountRow, CreateBankAccountInput, UpdateBankAccountInput } from "./bank-account-types"

export type BankAccountSavePrisma = Pick<PrismaClient, "bankAccount" | "glAccount">

function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, "")
}

export async function createBankAccount(
  prisma: BankAccountSavePrisma,
  input: CreateBankAccountInput
): Promise<BankAccountRow> {
  const bankName = input.bankName.trim()
  const accountName = input.accountName.trim()
  const accountNumber = normalizeAccountNumber(input.accountNumber)
  const currencyCode = (input.currencyCode?.trim() || "THB").toUpperCase()
  const glAccountIdInput = input.glAccountId?.trim() ?? ""
  const glAccountCodeInput = input.glAccountCode?.trim() ?? ""

  if (!bankName || !accountName || !accountNumber) {
    throw new BankAccountError(
      "bankName, accountName, and accountNumber are required",
      BankAccountErrorCodes.VALIDATION
    )
  }

  if (!glAccountIdInput && !glAccountCodeInput) {
    throw new BankAccountError(
      "glAccountId or glAccountCode is required",
      BankAccountErrorCodes.VALIDATION
    )
  }

  const glAccount = await prisma.glAccount.findFirst({
    where: {
      deleted: false,
      isActive: true,
      ...(glAccountIdInput
        ? { id: glAccountIdInput }
        : { code: glAccountCodeInput }),
    },
    select: { id: true },
  })

  if (!glAccount) {
    throw new BankAccountError(
      "GL account not found",
      BankAccountErrorCodes.GL_ACCOUNT_NOT_FOUND,
      404
    )
  }

  const existing = await prisma.bankAccount.findUnique({
    where: {
      legalEntityCode_accountNumber: {
        legalEntityCode: input.legalEntityCode,
        accountNumber,
      },
    },
    select: { id: true },
  })

  if (existing) {
    throw new BankAccountError(
      "Bank account number already exists for this legal entity",
      BankAccountErrorCodes.DUPLICATE,
      409
    )
  }

  const created = await prisma.bankAccount.create({
    data: {
      legalEntityCode: input.legalEntityCode,
      bankName,
      accountNumber,
      accountName,
      currencyCode,
      glAccountId: glAccount.id,
      isActive: input.isActive ?? true,
    },
  })

  return getBankAccountById(prisma, {
    id: created.id,
    legalEntityCode: input.legalEntityCode,
  })
}

async function resolveGlAccountId(
  prisma: BankAccountSavePrisma,
  glAccountIdInput: string,
  glAccountCodeInput: string
): Promise<string> {
  if (!glAccountIdInput && !glAccountCodeInput) {
    throw new BankAccountError(
      "glAccountId or glAccountCode is required",
      BankAccountErrorCodes.VALIDATION
    )
  }

  const glAccount = await prisma.glAccount.findFirst({
    where: {
      deleted: false,
      isActive: true,
      ...(glAccountIdInput ? { id: glAccountIdInput } : { code: glAccountCodeInput }),
    },
    select: { id: true },
  })

  if (!glAccount) {
    throw new BankAccountError(
      "GL account not found",
      BankAccountErrorCodes.GL_ACCOUNT_NOT_FOUND,
      404
    )
  }

  return glAccount.id
}

export async function updateBankAccount(
  prisma: BankAccountSavePrisma,
  input: UpdateBankAccountInput
): Promise<BankAccountRow> {
  const id = input.id.trim()
  if (!id) {
    throw new BankAccountError("id is required", BankAccountErrorCodes.VALIDATION)
  }

  const existing = await prisma.bankAccount.findFirst({
    where: { id, legalEntityCode: input.legalEntityCode },
  })

  if (!existing) {
    throw new BankAccountError("Bank account not found", BankAccountErrorCodes.NOT_FOUND, 404)
  }

  const bankName = input.bankName !== undefined ? input.bankName.trim() : undefined
  const accountName = input.accountName !== undefined ? input.accountName.trim() : undefined
  const accountNumberRaw =
    input.accountNumber !== undefined ? normalizeAccountNumber(input.accountNumber) : undefined
  const currencyCode =
    input.currencyCode !== undefined
      ? input.currencyCode.trim().toUpperCase() || "THB"
      : undefined

  if (bankName === "") {
    throw new BankAccountError("bankName cannot be empty", BankAccountErrorCodes.VALIDATION)
  }
  if (accountName === "") {
    throw new BankAccountError("accountName cannot be empty", BankAccountErrorCodes.VALIDATION)
  }
  if (accountNumberRaw === "") {
    throw new BankAccountError("accountNumber cannot be empty", BankAccountErrorCodes.VALIDATION)
  }

  if (accountNumberRaw && accountNumberRaw !== existing.accountNumber) {
    const duplicate = await prisma.bankAccount.findUnique({
      where: {
        legalEntityCode_accountNumber: {
          legalEntityCode: input.legalEntityCode,
          accountNumber: accountNumberRaw,
        },
      },
      select: { id: true },
    })
    if (duplicate && duplicate.id !== existing.id) {
      throw new BankAccountError(
        "Bank account number already exists for this legal entity",
        BankAccountErrorCodes.DUPLICATE,
        409
      )
    }
  }

  let glAccountId: string | undefined
  const glAccountIdInput = input.glAccountId?.trim() ?? ""
  const glAccountCodeInput = input.glAccountCode?.trim() ?? ""
  if (glAccountIdInput || glAccountCodeInput) {
    glAccountId = await resolveGlAccountId(prisma, glAccountIdInput, glAccountCodeInput)
  }

  await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(bankName !== undefined ? { bankName } : {}),
      ...(accountName !== undefined ? { accountName } : {}),
      ...(accountNumberRaw !== undefined ? { accountNumber: accountNumberRaw } : {}),
      ...(currencyCode !== undefined ? { currencyCode } : {}),
      ...(glAccountId !== undefined ? { glAccountId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })

  return getBankAccountById(prisma, { id, legalEntityCode: input.legalEntityCode })
}

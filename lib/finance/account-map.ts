import { DocType, PaymentMethod } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import { toMoney, ZERO } from "./decimal"
import type { JournalLineCodeDraft } from "./posting-types"

export const DEFAULT_ACCOUNT_CODES = {
  INVENTORY: "1000",
  CASH: "1100",
  CARD_CLEARING: "1110",
  REVENUE: "4000",
  COGS: "5000",
  AP: "2100",
} as const

export type ResolveAccountsForPosSaleInput = {
  paymentMethod: PaymentMethod
  total: Parameters<typeof toMoney>[0]
  cogsAmount?: Parameters<typeof toMoney>[0]
}

export type ResolveAccountsForPosRefundInput = {
  paymentMethod: PaymentMethod
  amount: Parameters<typeof toMoney>[0]
}

export type ResolveAccountsForStockDocumentInput = {
  docType: DocType
  inboundValue: Parameters<typeof toMoney>[0]
  outboundValue?: Parameters<typeof toMoney>[0]
}

function tenderAccountCode(method: PaymentMethod): string {
  if (method === PaymentMethod.CASH) {
    return DEFAULT_ACCOUNT_CODES.CASH
  }
  return DEFAULT_ACCOUNT_CODES.CARD_CLEARING
}

export function resolveAccountsForPosSale(
  input: ResolveAccountsForPosSaleInput
): JournalLineCodeDraft[] {
  const total = toMoney(input.total)
  if (total.lte(ZERO)) {
    throw new FinancePostingError("POS sale total must be positive", "INVALID_AMOUNT")
  }

  const lines: JournalLineCodeDraft[] = [
    {
      accountCode: tenderAccountCode(input.paymentMethod),
      debit: total,
      credit: ZERO,
      memo: "POS tender",
    },
    {
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      debit: ZERO,
      credit: total,
      memo: "POS revenue",
    },
  ]

  const cogs = toMoney(input.cogsAmount ?? ZERO)
  if (cogs.gt(ZERO)) {
    lines.push(
      {
        accountCode: DEFAULT_ACCOUNT_CODES.COGS,
        debit: cogs,
        credit: ZERO,
        memo: "COGS",
      },
      {
        accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
        debit: ZERO,
        credit: cogs,
        memo: "Inventory relief",
      }
    )
  }

  return lines
}

/** Money-only refund: reverse revenue and tender only — no COGS or inventory lines. */
export function resolveAccountsForPosRefund(
  input: ResolveAccountsForPosRefundInput
): JournalLineCodeDraft[] {
  const amount = toMoney(input.amount)
  if (amount.lte(ZERO)) {
    throw new FinancePostingError(
      "POS refund amount must be positive",
      "INVALID_AMOUNT"
    )
  }

  return [
    {
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      debit: amount,
      credit: ZERO,
      memo: "POS refund revenue reversal",
    },
    {
      accountCode: tenderAccountCode(input.paymentMethod),
      debit: ZERO,
      credit: amount,
      memo: "POS refund cash out",
    },
  ]
}

export function resolveAccountsForStockDocument(
  input: ResolveAccountsForStockDocumentInput
): JournalLineCodeDraft[] {
  const inbound = toMoney(input.inboundValue)
  const outbound = toMoney(input.outboundValue ?? ZERO)

  switch (input.docType) {
    case DocType.PURCHASE: {
      if (inbound.lte(ZERO)) {
        throw new FinancePostingError(
          "PURCHASE requires positive inboundValue",
          "INVALID_AMOUNT"
        )
      }
      return [
        {
          accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
          debit: inbound,
          credit: ZERO,
          memo: "Purchase inventory",
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.AP,
          debit: ZERO,
          credit: inbound,
          memo: "Accounts payable",
        },
      ]
    }
    case DocType.ADJUSTMENT: {
      if (inbound.gt(ZERO)) {
        return [
          {
            accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
            debit: inbound,
            credit: ZERO,
            memo: "Adjustment increase",
          },
          {
            accountCode: DEFAULT_ACCOUNT_CODES.COGS,
            debit: ZERO,
            credit: inbound,
            memo: "Adjustment offset",
          },
        ]
      }
      if (outbound.gt(ZERO)) {
        return [
          {
            accountCode: DEFAULT_ACCOUNT_CODES.COGS,
            debit: outbound,
            credit: ZERO,
            memo: "Adjustment decrease",
          },
          {
            accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
            debit: ZERO,
            credit: outbound,
            memo: "Inventory decrease",
          },
        ]
      }
      throw new FinancePostingError(
        "ADJUSTMENT requires inboundValue or outboundValue",
        "INVALID_AMOUNT"
      )
    }
    default:
      throw new FinancePostingError(
        `Unsupported stock document type for GL: ${input.docType}`,
        "UNSUPPORTED_DOC_TYPE"
      )
  }
}

export function buildJournalLineDraftsFromCodes(
  codeLines: JournalLineCodeDraft[],
  codeToId: Map<string, string>
): { glAccountId: string; debit: ReturnType<typeof toMoney>; credit: ReturnType<typeof toMoney>; memo?: string }[] {
  return codeLines.map((line) => {
    const glAccountId = codeToId.get(line.accountCode)
    if (!glAccountId) {
      throw new FinancePostingError(
        `GL account not found for code ${line.accountCode}`,
        "ACCOUNT_NOT_FOUND"
      )
    }
    return {
      glAccountId,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      memo: line.memo,
    }
  })
}
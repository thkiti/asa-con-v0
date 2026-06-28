import { DocType, PaymentMethod } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import { toMoney, ZERO } from "./decimal"
import type { PosVatEconomics } from "./pos-sale-vat"
import type { JournalLineCodeDraft } from "./posting-types"

export const DEFAULT_ACCOUNT_CODES = {
  INVENTORY: "1000",
  /** Legacy: 1001 เงินสดในเครื่องเก็บเงิน — cash in drawer / shop custody. */
  CASH: "1001",
  /** Stage 1 placeholder — legacy CoA has no card clearing account; verify before production. */
  CARD_CLEARING: "1110",
  /** Stage 1 placeholder — legacy CoA has no transfer clearing account; verify before production. */
  BANK_TRANSFER_CLEARING: "1120",
  /** Legacy: 1031 เงินสดระหว่างทาง — cash in transit (collector pickup). */
  CASH_IN_TRANSIT_COLLECTOR: "1031",
  /** Stage 1 placeholder — legacy CoA has no other-tender clearing account; verify before production. */
  POS_OTHER_CLEARING: "1190",
  /** Legacy: 1021 เงินฝากธนาคาร — Stage 1 POS checkout must never debit this. */
  BANK: "1021",
  REVENUE: "4000",
  OUTPUT_VAT: "4602",
  COGS: "5000",
  AP: "2100",
} as const

/** Account codes that must never receive a checkout debit (Stage 1). */
export const POS_CHECKOUT_FORBIDDEN_DEBIT_ACCOUNT_CODES = [
  DEFAULT_ACCOUNT_CODES.BANK,
] as const

export type ResolveAccountsForPosSaleInput = {
  paymentMethod: PaymentMethod
  total: Parameters<typeof toMoney>[0]
  cogsAmount?: Parameters<typeof toMoney>[0]
  vatEconomics: PosVatEconomics
}

export type ResolveAccountsForPosRefundInput = {
  paymentMethod: PaymentMethod
  amount: Parameters<typeof toMoney>[0]
  vatEconomics: PosVatEconomics
}

export type ResolveAccountsForStockDocumentInput = {
  docType: DocType
  inboundValue: Parameters<typeof toMoney>[0]
  outboundValue?: Parameters<typeof toMoney>[0]
}

export function resolveTenderAccountCodeForPosPayment(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return DEFAULT_ACCOUNT_CODES.CASH
    case PaymentMethod.CARD:
      return DEFAULT_ACCOUNT_CODES.CARD_CLEARING
    case PaymentMethod.QR:
    case PaymentMethod.TRANSFER:
    case PaymentMethod.BANK_TRANSFER:
      // When PaymentMethod.PROMPT_PAY is added, map it here to BANK_TRANSFER_CLEARING.
      return DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
    case PaymentMethod.OTHER:
      return DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING
    default: {
      const _exhaustive: never = method
      return _exhaustive
    }
  }
}

function buildPosSaleEconomicsLines(
  paymentMethod: PaymentMethod,
  vatEconomics: PosVatEconomics
): JournalLineCodeDraft[] {
  const { gross, net, vat, outputVatAccountCode } = vatEconomics
  return [
    {
      accountCode: resolveTenderAccountCodeForPosPayment(paymentMethod),
      debit: gross,
      credit: ZERO,
      memo: "POS tender",
    },
    {
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      debit: ZERO,
      credit: net,
      memo: "POS net revenue",
    },
    {
      accountCode: outputVatAccountCode,
      debit: ZERO,
      credit: vat,
      memo: "POS output VAT",
    },
  ]
}

export function resolveAccountsForPosSale(
  input: ResolveAccountsForPosSaleInput
): JournalLineCodeDraft[] {
  const gross = toMoney(input.total)
  if (gross.lte(ZERO)) {
    throw new FinancePostingError("POS sale total must be positive", "INVALID_AMOUNT")
  }

  const lines = buildPosSaleEconomicsLines(input.paymentMethod, input.vatEconomics)

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

/** Money-only refund: reverse net revenue, output VAT, and tender — no COGS or inventory lines. */
export function resolveAccountsForPosRefund(
  input: ResolveAccountsForPosRefundInput
): JournalLineCodeDraft[] {
  const gross = toMoney(input.amount)
  if (gross.lte(ZERO)) {
    throw new FinancePostingError(
      "POS refund amount must be positive",
      "INVALID_AMOUNT"
    )
  }

  const { net, vat, outputVatAccountCode } = input.vatEconomics

  return [
    {
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      debit: net,
      credit: ZERO,
      memo: "POS refund net revenue reversal",
    },
    {
      accountCode: outputVatAccountCode,
      debit: vat,
      credit: ZERO,
      memo: "POS refund output VAT reversal",
    },
    {
      accountCode: resolveTenderAccountCodeForPosPayment(input.paymentMethod),
      debit: ZERO,
      credit: gross,
      memo: "POS refund tender out",
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

/** Stage 2 POS settlement must never touch revenue, VAT, card/transfer clearing, or bank. */
export const POS_STAGE2_FORBIDDEN_ACCOUNT_CODES = [
  DEFAULT_ACCOUNT_CODES.REVENUE,
  DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
  DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
  DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
  DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
  DEFAULT_ACCOUNT_CODES.BANK,
] as const

export function assertPosStage2JournalAccountCodes(
  accountCodes: readonly string[]
): void {
  for (const code of accountCodes) {
    if (
      (POS_STAGE2_FORBIDDEN_ACCOUNT_CODES as readonly string[]).includes(code)
    ) {
      throw new FinancePostingError(
        `Stage 2 POS settlement must not use account ${code}`,
        "FORBIDDEN_STAGE2_ACCOUNT"
      )
    }
  }
}

export function resolveAccountsForPosCollectorPickup(
  amount: Parameters<typeof toMoney>[0]
): JournalLineCodeDraft[] {
  const cashAmount = toMoney(amount)
  if (cashAmount.lte(ZERO)) {
    throw new FinancePostingError(
      "Collector pickup amount must be positive",
      "INVALID_AMOUNT"
    )
  }

  const lines: JournalLineCodeDraft[] = [
    {
      accountCode: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
      debit: cashAmount,
      credit: ZERO,
      memo: "Cash in transit — collector pickup",
    },
    {
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      debit: ZERO,
      credit: cashAmount,
      memo: "Cash in drawer — collector pickup",
    },
  ]

  assertPosStage2JournalAccountCodes(lines.map((line) => line.accountCode))
  return lines
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
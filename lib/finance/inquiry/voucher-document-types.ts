import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

/** URL / filter shorthand for manual-journal family vouchers. */
export const VOUCHER_INQUIRY_DOC_TYPE_MJV = "MJV"

export const VOUCHER_INQUIRY_DOC_TYPE = {
  COL: "COL",
  PAY: "PAY",
  REC: "REC",
  REF: "REF",
  MJV: VOUCHER_INQUIRY_DOC_TYPE_MJV,
  OPB: "OPB",
  PAV: "PAV",
  REV: "REV",
  PCV: "PCV",
} as const

export type VoucherInquiryDocTypeCode =
  (typeof VOUCHER_INQUIRY_DOC_TYPE)[keyof typeof VOUCHER_INQUIRY_DOC_TYPE]

export type VoucherInquiryRefTypeOption = {
  value: string
  label: string
}

export const VOUCHER_INQUIRY_MJV_REF_TYPES = [
  FINANCE_REF_TYPES.MANUAL_JOURNAL,
  FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
  FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  FINANCE_REF_TYPES.RECLASS_JOURNAL,
  FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
] as const

export const VOUCHER_INQUIRY_OPB_REF_TYPES = [
  FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
] as const

/** Business-facing Type column / inquiry labels keyed by refType. */
export const VOUCHER_INQUIRY_REF_TYPE_LABELS: Record<string, string> = {
  [FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP]: "COL • Collector Pickup",
  [FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT]: "PAY • Bank Deposit",
  [FINANCE_REF_TYPES.POS_SALE]: "REC • Receipt",
  [FINANCE_REF_TYPES.POS_REFUND]: "REF • Refund",
  [FINANCE_REF_TYPES.PAYMENT_VOUCHER]: "PAV • Payment Voucher",
  [FINANCE_REF_TYPES.REVENUE_VOUCHER]: "REV • Revenue Voucher",
  [FINANCE_REF_TYPES.PETTY_CASH_VOUCHER]: "PCV • Petty Cash Voucher",
  [FINANCE_REF_TYPES.INVOICE_VOUCHER]: "INV • Invoice Voucher",
  [FINANCE_REF_TYPES.STOCK_DOC_POST]: "STK • Stock Document",
  [FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY]: "CLS • Period Closing",
  [FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL]: "OPB • Opening Balance",
}

for (const refType of VOUCHER_INQUIRY_MJV_REF_TYPES) {
  VOUCHER_INQUIRY_REF_TYPE_LABELS[refType] = "MJV • Manual Journal"
}

/** Doc Type dropdown options — no "All"; inquiry requires an explicit type. */
export const VOUCHER_INQUIRY_REF_TYPE_OPTIONS: VoucherInquiryRefTypeOption[] = [
  { value: VOUCHER_INQUIRY_DOC_TYPE.COL, label: "COL • Collector Pickup" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.PAY, label: "PAY • Bank Deposit" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.REC, label: "REC • Receipt" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.REF, label: "REF • Refund" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.MJV, label: "MJV • Manual Journal" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.OPB, label: "OPB • Opening Balance" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.PAV, label: "PAV • Payment Voucher" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.REV, label: "REV • Revenue Voucher" },
  { value: VOUCHER_INQUIRY_DOC_TYPE.PCV, label: "PCV • Petty Cash Voucher" },
]

export function hasFinanceDocumentInquiryDocType(
  refType: string | null | undefined
): boolean {
  return Boolean(String(refType ?? "").trim())
}

export function isFinanceDocumentInquiryRecDocType(
  refType: string | null | undefined
): boolean {
  return String(refType ?? "").trim().toUpperCase() === VOUCHER_INQUIRY_DOC_TYPE.REC
}

export function hasFinanceDocumentInquiryBranch(
  branchId: string | null | undefined
): boolean {
  return Boolean(String(branchId ?? "").trim())
}

const DOC_TYPE_TO_REF_TYPE: Record<string, string> = {
  [VOUCHER_INQUIRY_DOC_TYPE.COL]: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
  [VOUCHER_INQUIRY_DOC_TYPE.PAY]: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
  [VOUCHER_INQUIRY_DOC_TYPE.REC]: FINANCE_REF_TYPES.POS_SALE,
  [VOUCHER_INQUIRY_DOC_TYPE.REF]: FINANCE_REF_TYPES.POS_REFUND,
  [VOUCHER_INQUIRY_DOC_TYPE.OPB]: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  [VOUCHER_INQUIRY_DOC_TYPE.PAV]: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
  [VOUCHER_INQUIRY_DOC_TYPE.REV]: FINANCE_REF_TYPES.REVENUE_VOUCHER,
  [VOUCHER_INQUIRY_DOC_TYPE.PCV]: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
}

/** @deprecated Use VOUCHER_INQUIRY_DOC_TYPE_MJV */
export const VOUCHER_INQUIRY_REF_TYPE_MJV = VOUCHER_INQUIRY_DOC_TYPE_MJV

export function formatVoucherInquiryDocTypeLabel(refType: string): string {
  return VOUCHER_INQUIRY_REF_TYPE_LABELS[refType] ?? "Unknown document type"
}

/** Business document code (REC, MJV, OPB, …) for inquiry tables. */
export function resolveVoucherInquiryDocumentTypeCode(refType: string): string {
  if ((VOUCHER_INQUIRY_OPB_REF_TYPES as readonly string[]).includes(refType)) {
    return VOUCHER_INQUIRY_DOC_TYPE.OPB
  }
  if ((VOUCHER_INQUIRY_MJV_REF_TYPES as readonly string[]).includes(refType)) {
    return VOUCHER_INQUIRY_DOC_TYPE.MJV
  }
  for (const [code, mapped] of Object.entries(DOC_TYPE_TO_REF_TYPE)) {
    if (mapped === refType) return code
  }
  return refType
}

export function formatVoucherInquirySourceLabel(refType: string): string | null {
  switch (refType) {
    case FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP:
      return VOUCHER_INQUIRY_REF_TYPE_LABELS[refType] ?? null
    case FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT:
      return VOUCHER_INQUIRY_REF_TYPE_LABELS[refType] ?? null
    default:
      return null
  }
}

export function resolveVoucherInquiryRefTypeFilter(refType?: string): {
  refType?: string
  refTypeIn?: string[]
} {
  const raw = refType?.trim()
  if (!raw) return {}

  if (raw === VOUCHER_INQUIRY_DOC_TYPE_MJV) {
    return { refTypeIn: [...VOUCHER_INQUIRY_MJV_REF_TYPES] }
  }

  if (raw === VOUCHER_INQUIRY_DOC_TYPE.OPB) {
    return { refTypeIn: [...VOUCHER_INQUIRY_OPB_REF_TYPES] }
  }

  const mapped = DOC_TYPE_TO_REF_TYPE[raw]
  if (mapped) {
    return { refType: mapped }
  }

  return { refType: raw }
}

export function applyVoucherInquiryRefTypeFilter<
  T extends { refType?: string; refTypeIn?: string[] },
>(filter: T): T {
  const resolved = resolveVoucherInquiryRefTypeFilter(filter.refType)
  if (resolved.refTypeIn?.length) {
    const { refType: _drop, ...rest } = filter
    return { ...rest, refTypeIn: resolved.refTypeIn } as T
  }
  if (resolved.refType) {
    return { ...filter, refType: resolved.refType } as T
  }
  const { refType: _drop, ...rest } = filter
  return rest as T
}

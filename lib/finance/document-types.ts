export type FinanceDocumentTypeGroup = "POS" | "FINANCE" | "STOCK"

export const FINANCE_DOCUMENT_TYPE_GROUP_ORDER = [
  "POS",
  "FINANCE",
  "STOCK",
] as const satisfies readonly FinanceDocumentTypeGroup[]

export const FINANCE_DOCUMENT_TYPE_GROUP_LABELS: Record<FinanceDocumentTypeGroup, string> =
  {
    POS: "──────── POS ────────",
    FINANCE: "──────── FINANCE ────────",
    STOCK: "──────── STOCK ────────",
  }

export const FINANCE_DOCUMENT_TYPE_CODES = [
  "REC",
  "REF",
  "PAY",
  "PAV",
  "REV",
  "PCV",
  "MJV",
  "OPB",
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
] as const

export type FinanceDocumentTypeCode = (typeof FINANCE_DOCUMENT_TYPE_CODES)[number]

export interface FinanceDocumentTypeOption {
  value: FinanceDocumentTypeCode
  label: string
  group: FinanceDocumentTypeGroup
  businessName: string
}

function financeDocumentTypeOption(
  value: FinanceDocumentTypeCode,
  businessName: string,
  group: FinanceDocumentTypeGroup
): FinanceDocumentTypeOption {
  return {
    value,
    businessName,
    group,
    label: `${value} • ${businessName}`,
  }
}

/** Workflow-ordered finance document types for filters and lookups. */
export const FINANCE_DOCUMENT_TYPES: FinanceDocumentTypeOption[] = [
  financeDocumentTypeOption("REC", "Receipt", "POS"),
  financeDocumentTypeOption("REF", "Refund", "POS"),
  financeDocumentTypeOption("PAY", "Payment Voucher", "FINANCE"),
  financeDocumentTypeOption("PAV", "Payment Adjustment Voucher", "FINANCE"),
  financeDocumentTypeOption("REV", "Revenue Voucher", "FINANCE"),
  financeDocumentTypeOption("PCV", "Petty Cash Voucher", "FINANCE"),
  financeDocumentTypeOption("MJV", "Manual Journal Voucher", "FINANCE"),
  financeDocumentTypeOption("OPB", "Opening Balance", "FINANCE"),
  financeDocumentTypeOption("CNT", "Stock Count", "STOCK"),
  financeDocumentTypeOption("ADJ", "Stock Adjustment", "STOCK"),
  financeDocumentTypeOption("ORD", "Order Request", "STOCK"),
  financeDocumentTypeOption("DEY", "Delivery to Shop", "STOCK"),
  financeDocumentTypeOption("ORS", "Supplier Shipment", "STOCK"),
  financeDocumentTypeOption("ORI", "Shop Receipt", "STOCK"),
]

const FINANCE_DOCUMENT_TYPE_BY_VALUE = new Map(
  FINANCE_DOCUMENT_TYPES.map((option) => [option.value, option])
)

export type FinanceDocumentTypeSelectItem =
  | { kind: "group"; label: string; group: FinanceDocumentTypeGroup }
  | { kind: "option"; value: FinanceDocumentTypeCode; label: string }

export function getFinanceDocumentTypeOption(
  value: string
): FinanceDocumentTypeOption | undefined {
  return FINANCE_DOCUMENT_TYPE_BY_VALUE.get(value as FinanceDocumentTypeCode)
}

export function formatFinanceDocumentTypeLabel(value: string): string {
  return getFinanceDocumentTypeOption(value)?.label ?? value
}

export function listFinanceDocumentTypeOptions(input?: {
  allowedValues?: ReadonlySet<FinanceDocumentTypeCode>
}): FinanceDocumentTypeOption[] {
  if (!input?.allowedValues) {
    return [...FINANCE_DOCUMENT_TYPES]
  }

  return FINANCE_DOCUMENT_TYPES.filter((option) => input.allowedValues!.has(option.value))
}

export function buildFinanceDocumentTypeSelectItems(
  options: readonly FinanceDocumentTypeOption[],
  groups: readonly FinanceDocumentTypeGroup[] = FINANCE_DOCUMENT_TYPE_GROUP_ORDER
): FinanceDocumentTypeSelectItem[] {
  const items: FinanceDocumentTypeSelectItem[] = []

  for (const group of groups) {
    const groupOptions = options.filter((option) => option.group === group)
    if (groupOptions.length === 0) continue

    items.push({
      kind: "group",
      group,
      label: FINANCE_DOCUMENT_TYPE_GROUP_LABELS[group],
    })

    for (const option of groupOptions) {
      items.push({
        kind: "option",
        value: option.value,
        label: option.label,
      })
    }
  }

  return items
}

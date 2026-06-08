export const THERMAL_DOCUMENT_TYPES = [
  "RECEIPT",
  "REFUND",
  "COLLECTOR",
  "REPAIR_TICKET",
  "READ_Z",
] as const

export type ThermalDocumentType = (typeof THERMAL_DOCUMENT_TYPES)[number]

export type ThermalDocumentLayoutView = {
  documentType: ThermalDocumentType
  headerLine1: string | null
  headerLine2: string | null
  headerLine3: string | null
  footerLine1: string | null
  footerLine2: string | null
  footerLine3: string | null
  footerLine4: string | null
  footerLine5: string | null
  showAbbreviatedTaxTitle: boolean
  showVatIncludedMessage: boolean
}

export type ResolvedThermalLayout = ThermalDocumentLayoutView

export type ThermalLayoutMap = Record<ThermalDocumentType, ThermalDocumentLayoutView>

export type UpdateThermalDocumentLayoutInput = Omit<
  ThermalDocumentLayoutView,
  "documentType"
>

export type ReceiptPrintSettingsView = {
  companyDisplayName: string | null
  footerLine1: string | null
  footerLine2: string | null
  footerLine3: string | null
  footerLine4: string | null
  footerLine5: string | null
  showAbbreviatedTaxTitle: boolean
  showVatIncludedMessage: boolean
}

export type UpdateReceiptPrintSettingsInput = ReceiptPrintSettingsView

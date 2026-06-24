import {
  blockLinesToLegacyFooter,
  blockLinesToLegacyHeader,
  receiptLayoutBlocksFromView,
  splitReceiptBlockLines,
} from "@/lib/thermal/receipt-layout-blocks"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"

export function blockLayoutDraftFromView(
  layout: ThermalDocumentLayoutView
): ThermalDocumentLayoutView {
  const blocks = receiptLayoutBlocksFromView(layout)
  return {
    ...layout,
    headerBlockText: layout.headerBlockText?.trim()
      ? layout.headerBlockText
      : blocks.headerBlockText || null,
    subHeaderBlockText: layout.subHeaderBlockText?.trim()
      ? layout.subHeaderBlockText
      : null,
    footerBlockText: layout.footerBlockText?.trim()
      ? layout.footerBlockText
      : blocks.footerBlockText || null,
    headerFontSize: blocks.headerFontSize,
    subHeaderFontSize: blocks.subHeaderFontSize,
    footerFontSize: blocks.footerFontSize,
    headerBlockBold: layout.headerBlockBold,
    subHeaderBlockBold: layout.subHeaderBlockBold,
    footerBlockBold: layout.footerBlockBold,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
  }
}

export function blockLayoutInputFromDraft(draft: ThermalDocumentLayoutView) {
  const headerLines = splitReceiptBlockLines(draft.headerBlockText)
  const footerLines = splitReceiptBlockLines(draft.footerBlockText)
  const legacyHeader = blockLinesToLegacyHeader(headerLines)
  const legacyFooter = blockLinesToLegacyFooter(footerLines)

  return {
    ...legacyHeader,
    ...legacyFooter,
    headerBlockText: draft.headerBlockText?.trim() ? draft.headerBlockText : null,
    headerFontSize: draft.headerFontSize,
    headerBlockBold: draft.headerBlockBold,
    subHeaderBlockText: draft.subHeaderBlockText?.trim() ? draft.subHeaderBlockText : null,
    subHeaderFontSize: draft.subHeaderFontSize,
    subHeaderBlockBold: draft.subHeaderBlockBold,
    footerBlockText: draft.footerBlockText?.trim() ? draft.footerBlockText : null,
    footerFontSize: draft.footerFontSize,
    footerBlockBold: draft.footerBlockBold,
    infoBlockFontSize: draft.infoBlockFontSize,
    infoBlockBold: draft.infoBlockBold,
    showAbbreviatedTaxTitle: draft.showAbbreviatedTaxTitle,
    showVatIncludedMessage: draft.showVatIncludedMessage,
  }
}

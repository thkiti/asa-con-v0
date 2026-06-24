import type { BranchType } from "@/lib/shared/types"
import { buildReceiptSlipText } from "@/lib/pos/receipt-slip-format"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import { calculateReceiptVat7FromInclusive } from "@/lib/pos/receipt-vat-display"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import { THERMAL_COLUMNS, truncateThermalText } from "@/lib/thermal/format"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import {
  resolveSubHeaderBlockLines,
  splitReceiptBlockLines,
} from "@/lib/thermal/receipt-layout-blocks"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"

/** Monospace column budget for preview truncation — thermal builders still use THERMAL_COLUMNS. */
export const RECEIPT_SETUP_PREVIEW_MONO_COLUMNS = THERMAL_COLUMNS - 2

export type ReceiptSetupBranchOption = {
  id: string
  code: string
  name: string
  phone: string | null
  taxId: string | null
  type: BranchType
}

export type ReceiptSetupPreviewData = {
  headerLines: string[]
  headerFontSize: ReceiptBlockFontPx
  headerBold: boolean
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  identityLines: string[]
  identityBeforeMachineLines: string[]
  machineTaxId: string | null
  identityAfterMachineLines: string[]
  infoBlockFontSize: ReceiptBlockFontPx
  infoBlockBold: boolean
  refLine: string
  dateLine: string
  staffLabel: string
  staffValue: string
  sampleItemName: string
  sampleItemDetail: string
  sampleItemTotal: string
  totalLine: string
  vatLine: string
  paymentLabel: string
  paymentAmount: string
  changeLine: string
}

const SAMPLE_RECEIPT_NO = "REC-SH001-202606-0001"
const SAMPLE_STAFF = "103 • Somsak Kamnuch"
const SAMPLE_DATE = "21/06/2026 17:30"

export function formatReceiptSetupBranchLabel(branch: ReceiptSetupBranchOption): string {
  return `${branch.code} • ${branch.name}`
}

export function isReceiptSetupPreviewBranch(
  branch: ReceiptSetupBranchOption
): boolean {
  return branch.type === "SH" || branch.code === COMPANY_TAX_BRANCH_CODE
}

export function buildReceiptSetupPreviewData(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  layout: ThermalDocumentLayoutView
}): ReceiptSetupPreviewData {
  const { branch, companyTaxId, layout } = input
  const machineNo =
    branch.code === COMPANY_TAX_BRANCH_CODE ? null : branch.taxId?.trim() || null
  const companyTax = companyTaxId?.trim() || null

  const sampleTotal = "60.00"
  const paymentLabel = posReceiptSlipPaymentLabel("CASH")

  const identityBeforeMachineLines: string[] = [formatReceiptSetupBranchLabel(branch)]
  if (branch.phone?.trim()) identityBeforeMachineLines.push(`Tel. ${branch.phone.trim()}`)
  const machineTaxId = machineNo
  const identityAfterMachineLines: string[] = []
  if (companyTax) identityAfterMachineLines.push(`Tax ID ${companyTax}`)

  const identityLines = [...identityBeforeMachineLines]
  if (machineTaxId) identityLines.push(`M/C No. ${machineTaxId}`)
  identityLines.push(...identityAfterMachineLines)

  return {
    headerLines: splitReceiptBlockLines(layout.headerBlockText),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    footerLines: splitReceiptBlockLines(layout.footerBlockText),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
    identityLines,
    identityBeforeMachineLines,
    machineTaxId,
    identityAfterMachineLines,
    refLine: `Ref. ${SAMPLE_RECEIPT_NO}`,
    dateLine: SAMPLE_DATE,
    staffLabel: "Staff",
    staffValue: SAMPLE_STAFF,
    sampleItemName: truncateThermalText("Sample Product", RECEIPT_SETUP_PREVIEW_MONO_COLUMNS),
    sampleItemDetail: truncateThermalText("0101001=1x60", RECEIPT_SETUP_PREVIEW_MONO_COLUMNS),
    sampleItemTotal: formatReceiptMoney("60.00"),
    totalLine: formatReceiptMoney(sampleTotal),
    vatLine: calculateReceiptVat7FromInclusive(sampleTotal),
    paymentLabel,
    paymentAmount: formatReceiptMoney(sampleTotal),
    changeLine: formatReceiptMoney("0.00"),
  }
}

export function buildReceiptSetupSampleReceiptContext(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
}): ReceiptPrintContext {
  const { branch, companyTaxId } = input
  const machineNo =
    branch.code === COMPANY_TAX_BRANCH_CODE ? null : branch.taxId?.trim() || null

  return {
    saleId: "preview",
    receiptNo: `REC-${branch.code}-202606-0001`,
    issuedAt: "2026-06-04T12:00:00.000Z",
    branchCode: branch.code,
    branchName: branch.name,
    branchAddress: null,
    branchPhone: branch.phone,
    companyDisplayName: "ASA SERVICES",
    companyTaxId,
    machineTaxId: machineNo,
    cashierDisplay: "103-Somsak",
    lines: [
      {
        name: "Sample Product",
        code: "0101001",
        qty: 1,
        unitPrice: "60.00",
        lineTotal: "60.00",
      },
    ],
    total: "60.00",
    paymentMethod: "CASH",
    cashAmount: "60.00",
    change: "0.00",
    thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
    thermalLayout: DEFAULT_THERMAL_LAYOUTS.RECEIPT,
  }
}

export function buildReceiptSetupTicketLayout(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  layout: ThermalDocumentLayoutView
}) {
  const mergedLayouts = { ...DEFAULT_THERMAL_LAYOUTS, RECEIPT: input.layout }
  const receipt: ReceiptPrintContext = {
    ...buildReceiptSetupSampleReceiptContext(input),
    thermalLayouts: mergedLayouts,
    thermalLayout: input.layout,
  }
  return buildTicketLayout({
    documentType: "RECEIPT",
    receipt,
    layout: input.layout,
  })
}

export function buildReceiptSetupPrintSampleText(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  layout: ThermalDocumentLayoutView
}): string {
  const mergedLayouts = { ...DEFAULT_THERMAL_LAYOUTS, RECEIPT: input.layout }
  return buildReceiptSlipText({
    ...buildReceiptSetupSampleReceiptContext(input),
    thermalLayouts: mergedLayouts,
    thermalLayout: input.layout,
  })
}

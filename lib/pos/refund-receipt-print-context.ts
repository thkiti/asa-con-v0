import type { PrismaClient, RefundKind } from "@/generated/prisma/client"
import { COMPANY_TAX_BRANCH_CODE, loadCompanyTaxId } from "@/lib/thermal/company-tax"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { loadThermalLayouts } from "@/lib/thermal/load-layouts"
import type { ResolvedThermalLayout, ThermalLayoutMap } from "@/lib/thermal/types"
import { loadRefundReceiptForPrint } from "./load-refund-receipt"

export type RefundReceiptPrintContext = {
  refundId: string
  refundNo: string
  issuedAt: string
  kind: RefundKind
  amount: string
  reason: string | null
  branchId: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyDisplayName: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  cashierDisplay: string | null
  saleId: string | null
  originalReceiptId: string | null
  originalReceiptNo: string | null
  thermalLayouts: ThermalLayoutMap
  thermalLayout: ResolvedThermalLayout
}

export type RefundReceiptPrintDb = Pick<
  PrismaClient,
  "refund" | "staff" | "branch" | "thermalDocumentLayout"
>

export async function loadRefundReceiptPrintContext(
  db: RefundReceiptPrintDb,
  input: { refundId: string; branchId: string }
): Promise<RefundReceiptPrintContext> {
  const refundView = await loadRefundReceiptForPrint(db, input)
  const [companyTaxId, branchContact, thermalLayouts] = await Promise.all([
    loadCompanyTaxId(db),
    db.branch.findUnique({
      where: { id: input.branchId },
      select: { code: true, address: true, phone: true, taxId: true },
    }),
    loadThermalLayouts(db),
  ])

  const branchCode = branchContact?.code?.trim() || refundView.branchCode
  const machineRaw = branchContact?.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw
  const thermalLayout = resolveThermalLayout("REFUND", thermalLayouts)

  return {
    refundId: refundView.refundId,
    refundNo: refundView.refundNo,
    issuedAt: refundView.issuedAt,
    kind: refundView.kind,
    amount: refundView.amount,
    reason: refundView.reason,
    branchId: refundView.branchId,
    branchCode: refundView.branchCode,
    branchName: refundView.branchName,
    branchAddress: branchContact?.address?.trim() || null,
    branchPhone: branchContact?.phone?.trim() || null,
    companyDisplayName: thermalLayouts.RECEIPT.headerLine1,
    companyTaxId,
    machineTaxId,
    cashierDisplay: refundView.cashierDisplay,
    saleId: refundView.saleId,
    originalReceiptId: refundView.originalReceiptId,
    originalReceiptNo: refundView.originalReceiptNo,
    thermalLayouts,
    thermalLayout,
  }
}

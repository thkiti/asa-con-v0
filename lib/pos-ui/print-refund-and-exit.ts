import { fetchPosRefund } from "@/lib/pos-ui/pos-refund-client"
import { printRefundTicket } from "@/lib/pos-ui/print-refund-ticket"

export type RefundCommitInput = {
  saleId: string
  amount?: string
  reasonCode: string
}

export type SavedRefundSummary = {
  id: string
  refundNo: string
  amount: string
}

export type PrintRefundAndExitResult =
  | { ok: true }
  | { ok: false; error: string; phase: "save" | "print" }

async function waitForDomPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * REFUND end-of-flow: persist refund, refresh on-screen slip, print ticket, then close panel.
 */
export async function printRefundAndExit(
  commit: RefundCommitInput,
  onExit: () => void,
  onRefundSaved?: (refund: SavedRefundSummary) => void | Promise<void>
): Promise<PrintRefundAndExitResult> {
  const result = await fetchPosRefund(commit)
  if (!result.ok) {
    return { ok: false, error: result.error, phase: "save" }
  }

  await onRefundSaved?.(result.refund)
  await waitForDomPaint()

  if (!printRefundTicket()) {
    return { ok: false, error: "พิมพ์ใบคืนเงินไม่สำเร็จ", phase: "print" }
  }

  onExit()
  return { ok: true }
}

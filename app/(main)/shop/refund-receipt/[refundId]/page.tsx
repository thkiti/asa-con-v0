import { notFound, redirect } from "next/navigation"
import { PosRefundReceiptPage } from "@/components/pos/PosRefundReceiptPage"
import { getSession } from "@/lib/auth/session"
import { loadRefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"
import { prisma } from "@/lib/shared/prisma"

type PageProps = {
  params: Promise<{ refundId: string }>
  searchParams: Promise<{ autoprint?: string }>
}

export default async function ShopRefundReceiptPage({ params, searchParams }: PageProps) {
  const { refundId } = await params
  const query = await searchParams
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  try {
    requireStockDocumentSession(session)
  } catch {
    redirect("/unauthorized")
  }

  const branchId = session.branchId.trim()
  if (!branchId) {
    redirect("/unauthorized")
  }

  let receipt
  try {
    receipt = await loadRefundReceiptPrintContext(prisma, { refundId, branchId })
  } catch (err) {
    if (
      err instanceof PosLookupError &&
      (err.code === "REFUND_NOT_FOUND" ||
        err.code === "REFUND_ORIGINAL_RECEIPT_NOT_FOUND")
    ) {
      notFound()
    }
    throw err
  }

  const autoPrint = String(query.autoprint ?? "").trim() === "1"

  return <PosRefundReceiptPage receipt={receipt} autoPrint={autoPrint} />
}

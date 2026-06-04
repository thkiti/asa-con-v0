import { notFound, redirect } from "next/navigation"
import { PosSaleReceiptPage } from "@/components/pos/PosSaleReceiptPage"
import { getSession } from "@/lib/auth/session"
import { loadReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"
import { prisma } from "@/lib/shared/prisma"

type PageProps = {
  params: Promise<{ saleId: string }>
  searchParams: Promise<{ autoprint?: string }>
}

export default async function ShopSaleReceiptPage({ params, searchParams }: PageProps) {
  const { saleId } = await params
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
    receipt = await loadReceiptPrintContext(prisma, { saleId, branchId })
  } catch (err) {
    if (err instanceof PosLookupError && err.code === "SALE_NOT_FOUND") {
      notFound()
    }
    throw err
  }

  const autoPrint = String(query.autoprint ?? "").trim() === "1"

  return <PosSaleReceiptPage receipt={receipt} autoPrint={autoPrint} />
}

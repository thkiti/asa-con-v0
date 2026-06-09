import { redirect } from "next/navigation"
import { CheckReceiptPage } from "@/components/operations/check-receipt/CheckReceiptPage"
import { getSession } from "@/lib/auth/session"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { canViewCheckReceipt } from "@/lib/permissions/check-receipt"

export default async function OperationsCheckReceiptPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canViewCheckReceipt(session.role)) {
    redirect("/unauthorized")
  }

  return <CheckReceiptPage user={toSessionUserApi(session)} />
}

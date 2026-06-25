import { redirect } from "next/navigation"
import { ReceiptLookupPage } from "@/components/pos/ReceiptLookupPage"
import { getSession } from "@/lib/auth/session"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { canAccessRoute } from "@/lib/permissions"

export default async function ShopReceiptLookupPage() {
  const session = await getSession()
  if (!session || !canAccessRoute("/shop/receipt-lookup", session.role)) {
    redirect("/login")
  }

  return <ReceiptLookupPage user={toSessionUserApi(session)} />
}

import { redirect } from "next/navigation"
import { PosTerminalPage } from "@/components/pos/PosTerminalPage"
import { getSession } from "@/lib/auth/session"
import { isPosShopBranchCode } from "@/lib/pos/pos-shop-session"
import { canAccessRoute } from "@/lib/permissions"

export default async function ShopPage() {
  const session = await getSession()
  if (!session || !canAccessRoute("/shop", session.role)) {
    redirect("/login")
  }
  if (!isPosShopBranchCode(session.branchCode)) {
    redirect("/main")
  }

  return <PosTerminalPage />
}

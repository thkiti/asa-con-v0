import { redirect } from "next/navigation"
import { PosTerminalPage } from "@/components/pos/PosTerminalPage"
import { getSession } from "@/lib/auth/session"
import { canAccessRoute } from "@/lib/permissions"

export default async function ShopPage() {
  const session = await getSession()
  if (!session || !canAccessRoute("/shop", session.role)) {
    redirect("/login")
  }

  return <PosTerminalPage />
}

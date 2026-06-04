import { redirect } from "next/navigation"
import { SellingPricePage } from "@/components/pricing/SellingPricePage"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function SellingPriceRoutePage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!canAccessMasterDatabase(session.role)) redirect("/unauthorized")

  return <SellingPricePage />
}

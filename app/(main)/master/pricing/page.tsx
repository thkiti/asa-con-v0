import { redirect } from "next/navigation"
import { PricingHubView } from "@/components/pricing/PricingHubView"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function PricingHubPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!canAccessMasterDatabase(session.role)) redirect("/unauthorized")

  return <PricingHubView />
}

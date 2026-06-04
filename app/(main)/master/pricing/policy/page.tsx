import { redirect } from "next/navigation"
import { PricingPolicyPage } from "@/components/pricing/PricingPolicyPage"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function PricingPolicyRoutePage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!canAccessMasterDatabase(session.role)) redirect("/unauthorized")

  return <PricingPolicyPage />
}

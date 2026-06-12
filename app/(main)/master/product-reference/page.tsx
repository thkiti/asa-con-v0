import { redirect } from "next/navigation"
import { ProductReferencePage } from "@/components/master/product-reference/ProductReferencePage"
import { getSession } from "@/lib/auth"
import { canAccessMasterDatabase } from "@/lib/permissions/master"

export default async function MasterProductReferencePage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessMasterDatabase(session.role)) {
    redirect("/unauthorized")
  }

  return <ProductReferencePage documentEntityCode={session.documentEntityCode} />
}

import { redirect } from "next/navigation"
import { ProductReferencePage } from "@/components/master/product-reference/ProductReferencePage"
import { getSession } from "@/lib/auth"
import { canAccessProductReference } from "@/lib/permissions/master"

export default async function MasterProductReferencePage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!canAccessProductReference(session.role)) {
    redirect("/unauthorized")
  }

  return <ProductReferencePage documentEntityCode={session.documentEntityCode} />
}

import { redirect } from "next/navigation"
import { ImportEntityPage } from "@/components/system/import/ImportEntityPage"
import { getSession } from "@/lib/auth"

export default async function SystemImportReferenceStockPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <ImportEntityPage
      entity="reference-stock"
      documentEntityCode={session.documentEntityCode}
    />
  )
}

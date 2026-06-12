import { redirect } from "next/navigation"
import { ImportEntityPage } from "@/components/system/import/ImportEntityPage"
import { getSession } from "@/lib/auth"

export default async function SystemImportBranchPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <ImportEntityPage entity="branch" documentEntityCode={session.documentEntityCode} />
  )
}

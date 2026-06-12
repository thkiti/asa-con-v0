import { redirect } from "next/navigation"
import { ImportDashboard } from "@/components/system/import/ImportDashboard"
import { getSession } from "@/lib/auth"

export default async function SystemImportPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return <ImportDashboard documentEntityCode={session.documentEntityCode} />
}

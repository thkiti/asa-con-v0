import { redirect } from "next/navigation"
import { BankStatementEditorPage } from "@/components/finance/bank-statements/BankStatementEditorPage"
import { getSession } from "@/lib/auth"
import { canAccessFinanceMenu } from "@/lib/main-ui/finance-menu"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { isHoMainMenuRole } from "@/lib/main-ui/main-menu"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isHoMainMenuRole(session.role) || !canAccessFinanceMenu(session.role)) {
    redirect("/unauthorized")
  }

  const { id } = await params

  return (
    <main className={financeAdminPageClass}>
      <BankStatementEditorPage statementId={id} />
    </main>
  )
}

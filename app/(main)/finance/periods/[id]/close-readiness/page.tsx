import { CloseReadinessPage } from "@/components/finance/CloseReadinessPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"
import { isOpeningBalancePeriodKey } from "@/lib/finance/opening-balance-period"
import { buildOpeningBalanceReviewPath } from "@/lib/finance-ui/opening-balance-review"
import { prisma } from "@/lib/shared/prisma"
import { notFound, redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodCloseReadinessPage({
  params,
}: PageProps) {
  const { id } = await params

  const period = await prisma.accountingPeriod.findUnique({
    where: { id },
    select: { id: true, periodKey: true },
  })

  if (!period) {
    notFound()
  }

  if (isOpeningBalancePeriodKey(period.periodKey)) {
    redirect(buildOpeningBalanceReviewPath(period.id))
  }

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Close readiness"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Is this accounting period safe to close? Review reconciliation evidence, frozen snapshots, posting lock state, and audit artifacts."
    >
      <CloseReadinessPage periodId={id} />
    </FinanceAdminPageShell>
  )
}

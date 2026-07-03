import { OpeningBalanceReviewPage } from "@/components/finance/OpeningBalanceReviewPage"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"
import { buildOpeningBalanceReviewForPeriod } from "@/lib/finance/opening-balance-review"
import { isOpeningBalancePeriodKey } from "@/lib/finance/opening-balance-period"
import { buildCloseReadinessPath } from "@/lib/finance-ui/close-readiness"
import { prisma } from "@/lib/shared/prisma"
import { notFound, redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FinancePeriodOpeningBalanceReviewRoutePage({
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

  if (!isOpeningBalancePeriodKey(period.periodKey)) {
    redirect(buildCloseReadinessPath(period.id))
  }

  await buildOpeningBalanceReviewForPeriod(prisma, period.id)

  return (
    <FinanceAdminPageShell
      backHref="/finance/periods"
      backLabel="← Accounting periods"
      heading={
        <EntityContextPageHeading
          title="Opening balance review"
          className={financeAdminPageTitleClass}
        />
      }
      intro="Review the imported opening balances before starting live accounting."
    >
      <OpeningBalanceReviewPage periodId={id} />
    </FinanceAdminPageShell>
  )
}

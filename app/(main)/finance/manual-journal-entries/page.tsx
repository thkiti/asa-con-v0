import Link from "next/link"
import {
  financeAdminContentClass,
  financeAdminIntroClass,
  financeDocumentPageClass,
} from "@/lib/main-ui/finance-page-layout"
import { FinanceDocumentContainer } from "@/components/finance/FinanceDocumentContainer"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import { parseDocumentEntityCode } from "@/lib/legal-entity"
import { getSession } from "@/lib/auth"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await getSession()
  const legalEntityCode =
    parseDocumentEntityCode(params.legalEntityCode) ?? session?.documentEntityCode ?? null

  return (
    <main className={financeDocumentPageClass}>
      <FinanceDocumentContainer>
        <Link href="/finance" className={`text-sm ${themeLinkMuted}`}>
          ← Finance
        </Link>
        <EntityContextPageHeading
          title="Journal entries"
          legalEntityCode={legalEntityCode}
          className="mt-4 text-xl font-semibold"
        />
        <p className={financeAdminIntroClass}>
          Operational manual journal workflow — draft, submit, confirm, and post to GL.
          Document numbers use type codes (MJV, OPB, etc.) without legal entity prefix.
        </p>
        <div className={financeAdminContentClass}>
          <ManualJournalEntryListPage />
        </div>
      </FinanceDocumentContainer>
    </main>
  )
}

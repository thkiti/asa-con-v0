import { getSession } from "@/lib/auth/session"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  formatEntityContextTitleOrDefault,
  parseDocumentEntityCode,
} from "@/lib/legal-entity"

type EntityContextPageHeadingProps = {
  title: string
  segments?: string[]
  className?: string
  /** URL/request-scoped entity — overrides session cookie for display. */
  legalEntityCode?: DocumentEntityCode | null
}

/** Server page heading with legal-entity prefix — e.g. ASAS • TRIAL BALANCE */
export async function EntityContextPageHeading({
  title,
  segments = [],
  className = "mt-4 text-xl font-semibold",
  legalEntityCode: legalEntityCodeProp,
}: EntityContextPageHeadingProps) {
  const session = await getSession()
  const legalEntityCode =
    legalEntityCodeProp ??
    parseDocumentEntityCode(session?.documentEntityCode) ??
    session?.documentEntityCode ??
    null
  const display = formatEntityContextTitleOrDefault(
    legalEntityCode,
    title,
    ...segments
  )

  return (
    <h1 className={className} data-testid="entity-context-page-title">
      {display}
    </h1>
  )
}

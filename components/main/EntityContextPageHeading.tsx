import { getSession } from "@/lib/auth/session"
import { formatEntityContextTitleOrDefault } from "@/lib/legal-entity"

type EntityContextPageHeadingProps = {
  title: string
  segments?: string[]
  className?: string
}

/** Server page heading with legal-entity prefix — e.g. ASAS • TRIAL BALANCE */
export async function EntityContextPageHeading({
  title,
  segments = [],
  className = "mt-4 text-xl font-semibold",
}: EntityContextPageHeadingProps) {
  const session = await getSession()
  const display = formatEntityContextTitleOrDefault(
    session?.documentEntityCode,
    title,
    ...segments
  )

  return (
    <h1 className={className} data-testid="entity-context-page-title">
      {display}
    </h1>
  )
}

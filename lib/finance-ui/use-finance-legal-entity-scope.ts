"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  appendFinanceLegalEntityToPath,
  readFinanceLegalEntityFromSearchParams,
  resolveFinanceLegalEntityCode,
} from "@/lib/finance-ui/finance-entity-scope"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

/**
 * Active finance legal entity for the current page.
 * URL query is authoritative; session cookie is bootstrap only when URL omits entity.
 */
export function useFinanceLegalEntityScope(): DocumentEntityCode {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sessionEntity, setSessionEntity] = useState<DocumentEntityCode | null>(null)

  const urlEntity = useMemo(
    () => readFinanceLegalEntityFromSearchParams(searchParams),
    [searchParams]
  )

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (session?.documentEntityCode) {
        setSessionEntity(session.documentEntityCode)
      }
    })
  }, [])

  useEffect(() => {
    if (urlEntity || !sessionEntity) return
    const search = searchParams.toString()
    const currentPath = search ? `${pathname}?${search}` : pathname
    router.replace(appendFinanceLegalEntityToPath(currentPath, sessionEntity), {
      scroll: false,
    })
  }, [urlEntity, sessionEntity, pathname, searchParams, router])

  return resolveFinanceLegalEntityCode(urlEntity, sessionEntity)
}

/** Build a finance navigation path preserving the active legal entity. */
export function useFinanceEntityPathBuilder(): (
  path: string,
  entityOverride?: DocumentEntityCode
) => string {
  const legalEntityCode = useFinanceLegalEntityScope()
  return (path: string, entityOverride?: DocumentEntityCode) =>
    appendFinanceLegalEntityToPath(path, entityOverride ?? legalEntityCode)
}

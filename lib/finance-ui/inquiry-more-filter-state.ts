import { useCallback, useEffect, useState } from "react"

/**
 * Local open state for inquiry More filter date box.
 * Closes whenever applied filter query changes (e.g. after Search navigates).
 */
export function useInquiryMoreFilterOpen(appliedFilterQuery: string) {
  const [isMoreFilterOpen, setIsMoreFilterOpen] = useState(false)

  useEffect(() => {
    setIsMoreFilterOpen(false)
  }, [appliedFilterQuery])

  const closeMoreFilter = useCallback(() => setIsMoreFilterOpen(false), [])

  return { isMoreFilterOpen, setIsMoreFilterOpen, closeMoreFilter }
}

export const INQUIRY_FILTER_DISMISS_ATTR = "data-inquiry-filter-dismiss"

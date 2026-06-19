"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { buildFinanceCurrentReturnPath } from "@/lib/finance-ui/finance-navigation"

/** Current app path for finance drill-down returnTo (pathname + query, excluding returnTo loop). */
export function useFinanceCurrentReturnPath(): string {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())
  params.delete("returnTo")
  const search = params.toString()
  return buildFinanceCurrentReturnPath(pathname, search)
}

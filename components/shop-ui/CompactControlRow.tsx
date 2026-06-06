import type { ReactNode } from "react"
import { compactHeaderRowGridClass } from "@/lib/shop-ui/compact-form-helpers"

type CompactControlRowProps = {
  children: ReactNode
  className?: string
  gridClassName?: string
  testId?: string
}

export function CompactControlRow({
  children,
  className = "",
  gridClassName = compactHeaderRowGridClass,
  testId,
}: CompactControlRowProps) {
  return (
    <div className={`${gridClassName} ${className}`.trim()} data-testid={testId}>
      {children}
    </div>
  )
}

export { compactHeaderRowGridClass as COMPACT_HEADER_ROW_GRID_CLASS }

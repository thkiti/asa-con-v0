"use client"

import {
  useEffect,
  useId,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import {
  voucherInquiryFilterMore,
  voucherInquiryFilterPeriodGroup,
  voucherInquiryMoreFilterButton,
  voucherInquiryMoreFilterButtonActive,
  voucherInquiryMoreFilterButtonDot,
  voucherInquiryMoreFilterPopover,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel } from "@/lib/theme/theme-classes"

export type MoreFilterPopoverProps = {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
  /** When true, shows the active-state styling on the trigger dot. */
  active?: boolean
  /** Optional Period (or other) control rendered before the more-filter trigger. */
  leading?: ReactNode
  children: ReactNode
  testId?: string
  panelTestId?: string
  panelAriaLabel?: string
  title?: string
  className?: string
  /** Close on Escape. Default true. */
  closeOnEscape?: boolean
  /** Close on outside mousedown. Default true. */
  closeOnOutsideClick?: boolean
}

function setOpen(
  onOpenChange: MoreFilterPopoverProps["onOpenChange"],
  next: boolean
) {
  onOpenChange(next)
}

/**
 * Shared More Filter chrome: trigger dot, active state, panel, outside click,
 * and Escape. Callers own filter fields and active-state semantics.
 */
export function MoreFilterPopover({
  open,
  onOpenChange,
  active = false,
  leading,
  children,
  testId = "more-filter",
  panelTestId,
  panelAriaLabel = "More filters",
  title = "More filter",
  className = voucherInquiryFilterPeriodGroup,
  closeOnEscape = true,
  closeOnOutsideClick = true,
}: MoreFilterPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const resolvedPanelTestId = panelTestId ?? `${testId}-panel`

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!closeOnOutsideClick) return
      const target = event.target
      if (rootRef.current?.contains(target as Node)) return
      setOpen(onOpenChange, false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape) return
      if (event.key === "Escape") {
        event.preventDefault()
        setOpen(onOpenChange, false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onOpenChange, closeOnEscape, closeOnOutsideClick])

  const handleToggle = () => {
    setOpen(onOpenChange, !open)
  }

  return (
    <div ref={rootRef} className={className}>
      {leading}
      <div className={voucherInquiryFilterMore}>
        <span className={`${themeLabel} invisible select-none`} aria-hidden="true">
          &nbsp;
        </span>
        <button
          type="button"
          className={`${voucherInquiryMoreFilterButton}${
            active ? ` ${voucherInquiryMoreFilterButtonActive}` : ""
          }`}
          title={title}
          aria-label={title}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          data-active={active ? "true" : "false"}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleToggle}
          data-testid={testId}
        >
          <span className={voucherInquiryMoreFilterButtonDot} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div
          id={popoverId}
          className={voucherInquiryMoreFilterPopover}
          data-testid={resolvedPanelTestId}
          role="group"
          aria-label={panelAriaLabel}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

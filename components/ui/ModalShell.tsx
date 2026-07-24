"use client"

import {
  useEffect,
  useId,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import {
  themeDialogOverlay,
} from "@/lib/theme/theme-classes"

export type ModalShellOverlayAlign = "end" | "center"

export type ModalShellProps = {
  open: boolean
  onClose: () => void
  /** Dialog title text (rendered in header when `title` is set). */
  title?: ReactNode
  titleId?: string
  children: ReactNode
  /** Optional footer actions row (confirm buttons, form submit, etc.). */
  footer?: ReactNode
  /**
   * Extra classes for the panel (width, padding). Defaults to a bordered card shell.
   * Callers set `max-w-lg` / `max-w-2xl` etc. — sizes are not forced identical.
   */
  panelClassName?: string
  /** Optional overlay class override (defaults by `overlayAlign`). */
  overlayClassName?: string
  /** Overlay alignment. Form modals use `end` (mobile sheet); confirms often `center`. */
  overlayAlign?: ModalShellOverlayAlign
  /** Close when the dimmed backdrop is clicked. Default true. */
  closeOnOverlayClick?: boolean
  /** Close on Escape. Default true. */
  closeOnEscape?: boolean
  "data-testid"?: string
}

const DEFAULT_PANEL =
  "w-full rounded-lg border border-border bg-card text-card-foreground shadow-lg"

/** Centered overlay matching legacy confirm dialogs (bg-black/30). */
const CENTERED_OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"

/**
 * Shared modal overlay + panel chrome.
 * Domain forms/dialogs own validation, submit, and panel dimensions via `panelClassName`.
 */
export function ModalShell({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  children,
  footer,
  panelClassName,
  overlayClassName,
  overlayAlign = "end",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  "data-testid": testId,
}: ModalShellProps) {
  const generatedId = useId()
  const titleId = titleIdProp ?? generatedId

  useEffect(() => {
    if (!open || !closeOnEscape) return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  const overlayClass =
    overlayClassName ??
    (overlayAlign === "center" ? CENTERED_OVERLAY : themeDialogOverlay)

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return
    if (event.key === "Enter" || event.key === " ") {
      // Backdrop is mouse-oriented; ignore keyboard activation on the overlay itself.
    }
  }

  return (
    <div
      className={overlayClass}
      role="presentation"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      data-testid={testId ? `${testId}-overlay` : undefined}
    >
      <div
        className={`${DEFAULT_PANEL} ${panelClassName ?? "max-w-lg p-6"}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
        ) : null}
        <div className={title ? "mt-2" : undefined}>{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

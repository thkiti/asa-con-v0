import type { SessionUserApi } from "@/lib/auth/session-user-api"

export type PosPlaceholderId =
  | "worktime"
  | "target-vs-sales"
  | "collector"
  | "read-x"
  | "read-z"
  | "staff-evidence"
  | "repair-ticket"
  | "print-report"

export type PosKeypadActionId =
  | PosPlaceholderId
  | "checkout"
  | "logout"
  | "refund"
  | "order"
  | "stock-count"
  | "digit-7"
  | "digit-8"
  | "digit-9"
  | "digit-4"
  | "digit-5"
  | "digit-6"
  | "digit-1"
  | "digit-2"
  | "digit-3"
  | "digit-0"
  | "digit-dot"
  | "backspace"
  | "clear"
  | "enter"

export type PosKeypadButtonVariant =
  | "worktime"
  | "target"
  | "collector"
  | "logout"
  | "digit"
  | "control"
  | "enter"
  | "refund"
  | "order"
  | "stock-count"
  | "repair"
  | "read-x"
  | "read-z"
  | "staff-evidence"
  | "print-report"
  | "checkout"

export type PosKeypadButtonDef = {
  id: PosKeypadActionId
  label: string
  col: number
  row: number
  colSpan?: number
  rowSpan?: number
  variant: PosKeypadButtonVariant
  /** Multi-line label uses <br /> in UI */
  multiline?: boolean
}

export type PosTerminalSession = SessionUserApi

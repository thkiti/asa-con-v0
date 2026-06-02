import type { DocStatus, DocType } from "@/generated/prisma/client"
import type { StockDocumentWithLines } from "../posting-types"

export type DocumentWorkflowAction =
  | "SUBMIT"
  | "SHIP"
  | "CONFIRM"
  | "RECEIVE"
  | "TRANSFER"
  | "POST"
  | "CANCEL"
  | "DELETE_DRAFT"

export type VoidResolution = "DELETE" | "CANCEL" | "FORBIDDEN"

/** Only POST may precede ledger calls — enforced in posting.ts */
export const LEDGER_MUTATING_ACTION = "POST" as const

export type TransitionContext = {
  docType: DocType
  fromStatus: DocStatus
  action: DocumentWorkflowAction
}

export type ApplyPostedTransitionInput = {
  documentId: string
  postedByStaffId: string
  priorStatus: DocStatus
  confirmedAt: Date | null
  confirmedByStaffId: string | null
}

export type ApplyCancelledTransitionInput = {
  documentId: string
  cancelledByStaffId: string
  cancelReason?: string | null
}

export type DeleteDraftDocumentInput = {
  documentId: string
}

export type { StockDocumentWithLines }

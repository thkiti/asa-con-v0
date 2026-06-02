import type { DocStatus, DocType, Prisma } from "@/generated/prisma/client"
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

export type ApplySubmittedTransitionInput = {
  documentId: string
}

export type ApplyConfirmedTransitionInput = {
  documentId: string
  confirmedByStaffId: string
}

export type SaveDocumentLineInput = {
  productId: string
  qty: number
  endingQty?: number | null
  reviewPostingDelta?: number | null
}

export type SaveDocumentInput = {
  id?: string | null
  docType: DocType
  date: Date | string
  branchId: string
  fromLocId?: string | null
  toLocId?: string | null
  createdByStaffId?: string | null
  lines: SaveDocumentLineInput[]
  tx?: Prisma.TransactionClient
}

export type SubmitDocumentInput = {
  documentId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmDocumentInput = {
  documentId: string
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelDocumentInput = {
  documentId: string
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type DeleteDraftDocumentOrchestratorInput = {
  documentId: string
  tx?: Prisma.TransactionClient
}

export type { StockDocumentWithLines }

"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
import {
  addEditorLine,
  createDraftEditorState,
  detailToEditorState,
  isShopDocType,
  postSaveEditorPath,
  removeEditorLine,
  updateEditorLine,
} from "@/lib/stock-ui/editor-draft-state"
import type { EditorLineRowVM, StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"
import { fetchStockDocumentDetail } from "@/lib/stock-ui/fetchers"
import { fetchShopSession } from "@/lib/stock-ui/session"
import { saveStockDocumentEditor } from "@/lib/stock-ui/stock-document-editor-save"
import {
  cancelStockDocument,
  confirmStockDocument,
  postStockDocument,
  submitStockDocument,
} from "@/lib/stock-ui/stock-document-workflow-actions"
import type {
  DocType,
  StockDocumentActionId,
  StockDocumentActionVM,
  StockDocumentDetailVM,
} from "@/lib/stock-ui/types"
import type { Role } from "@/lib/shared"
import { StockDocumentEditorView } from "./StockDocumentEditorView"

type CreateProps = {
  mode: "create"
  docType: DocType
}

type EditProps = {
  mode: "edit"
  documentId: string
}

export type StockDocumentEditorControllerProps = CreateProps | EditProps

function workflowSuccessMessage(actionId: StockDocumentActionId): string {
  switch (actionId) {
    case "save":
      return "Draft saved."
    case "submit":
      return "Document submitted."
    case "confirm":
      return "Document confirmed."
    case "cancel":
      return "Document cancelled."
    case "post":
      return "Document posted."
    default:
      return "Done."
  }
}

export function StockDocumentEditorController(props: StockDocumentEditorControllerProps) {
  const router = useRouter()
  const [state, setState] = useState<StockDocumentEditorStateVM | null>(null)
  const [detailSnapshot, setDetailSnapshot] = useState<StockDocumentDetailVM | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionBusy, setActionBusy] = useState<StockDocumentActionId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)

  const applyDetail = useCallback((detail: StockDocumentDetailVM) => {
    setDetailSnapshot(detail)
    setState(detailToEditorState(detail))
  }, [])

  const actions: StockDocumentActionVM[] = useMemo(() => {
    if (!state || !role) return []
    return getEditorWorkflowActions(
      { role, docType: state.docType, status: state.status },
      { hasDocumentId: Boolean(state.documentId) }
    )
  }, [role, state])

  const refreshDocument = useCallback(
    async (documentId: string) => {
      const detail = await fetchStockDocumentDetail(documentId)
      applyDetail(detail)
      return detail
    },
    [applyDetail]
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      setStatusMessage(null)

      try {
        const session = await fetchShopSession()
        if (cancelled) return
        setStaffId(session.staffId)
        setRole(session.role)

        if (props.mode === "create") {
          if (!isShopDocType(props.docType)) {
            throw new Error("Invalid document type for shop editor")
          }
          setDetailSnapshot(null)
          setState(createDraftEditorState(props.docType, session.branchId))
          setLoading(false)
          return
        }

        const detail = await fetchStockDocumentDetail(props.documentId)
        if (cancelled) return
        applyDetail(detail)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(toStockDocumentUiError(err).message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [applyDetail, props])

  const handleHeaderChange = useCallback((patch: Partial<StockDocumentEditorStateVM>) => {
    setState((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleAddLine = useCallback(() => {
    setState((prev) =>
      prev && !prev.readOnly ? { ...prev, lines: addEditorLine(prev.lines) } : prev
    )
  }, [])

  const handleRemoveLine = useCallback((key: string) => {
    setState((prev) =>
      prev && !prev.readOnly
        ? { ...prev, lines: removeEditorLine(prev.lines, key) }
        : prev
    )
  }, [])

  const handleLineChange = useCallback(
    (key: string, patch: Partial<EditorLineRowVM>) => {
      setState((prev) =>
        prev && !prev.readOnly
          ? { ...prev, lines: updateEditorLine(prev.lines, key, patch) }
          : prev
      )
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!state || state.readOnly || !staffId) return

    setSaving(true)
    setError(null)
    setStatusMessage(null)

    try {
      const priorLines = state.lines
      const saved = await saveStockDocumentEditor(state, staffId, priorLines)
      applyDetail(saved)
      setStatusMessage(workflowSuccessMessage("save"))

      const redirect = postSaveEditorPath(props.mode, saved.id)
      if (redirect) {
        router.replace(redirect)
      }
    } catch (err: unknown) {
      setError(toStockDocumentUiError(err).message)
    } finally {
      setSaving(false)
    }
  }, [applyDetail, props, router, staffId, state])

  const handleWorkflowAction = useCallback(
    async (actionId: StockDocumentActionId) => {
      if (actionId === "print") {
        if (detailSnapshot) {
          window.print()
        }
        return
      }

      if (actionId === "save") {
        await handleSave()
        return
      }

      if (!state?.documentId || !staffId) return

      setActionBusy(actionId)
      setError(null)
      setStatusMessage(null)

      try {
        let detail
        switch (actionId) {
          case "submit":
            detail = await submitStockDocument(state.documentId)
            break
          case "confirm":
            detail = await confirmStockDocument(state.documentId, staffId)
            break
          case "cancel":
            detail = await cancelStockDocument(state.documentId, staffId)
            break
          case "post":
            detail = await postStockDocument(state.documentId, staffId)
            break
          default:
            return
        }

        applyDetail(detail)
        setStatusMessage(workflowSuccessMessage(actionId))

        if (actionId === "cancel" && detail.status === "CANCELLED") {
          router.replace("/shop/stock-documents")
        }
      } catch (err: unknown) {
        setError(toStockDocumentUiError(err).message)
        if (state.documentId) {
          try {
            await refreshDocument(state.documentId)
          } catch {
            // keep prior state when refresh fails
          }
        }
      } finally {
        setActionBusy(null)
      }
    },
    [applyDetail, detailSnapshot, handleSave, refreshDocument, router, staffId, state]
  )

  const placeholderState: StockDocumentEditorStateVM = {
    documentId: null,
    refNo: null,
    docType: props.mode === "create" ? props.docType : "PERFORMANCE",
    status: "DRAFT",
    date: "",
    branchId: "",
    fromLocId: "",
    toLocId: "",
    readOnly: false,
    lines: [],
  }

  return (
    <StockDocumentEditorView
      state={state ?? placeholderState}
      detailSnapshot={detailSnapshot}
      loading={loading}
      saving={saving}
      actionBusy={actionBusy}
      actions={actions}
      error={error}
      statusMessage={statusMessage}
      onHeaderChange={handleHeaderChange}
      onAddLine={handleAddLine}
      onRemoveLine={handleRemoveLine}
      onLineChange={handleLineChange}
      onWorkflowAction={(id) => void handleWorkflowAction(id)}
    />
  )
}

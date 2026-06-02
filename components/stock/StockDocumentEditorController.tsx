"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
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
import type { DocType } from "@/lib/stock-ui/types"
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

export function StockDocumentEditorController(props: StockDocumentEditorControllerProps) {
  const router = useRouter()
  const [state, setState] = useState<StockDocumentEditorStateVM | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      setSaveMessage(null)

      try {
        const session = await fetchShopSession()
        if (cancelled) return
        setStaffId(session.staffId)

        if (props.mode === "create") {
          if (!isShopDocType(props.docType)) {
            throw new Error("Invalid document type for shop editor")
          }
          setState(createDraftEditorState(props.docType, session.branchId))
          setLoading(false)
          return
        }

        const detail = await fetchStockDocumentDetail(props.documentId)
        if (cancelled) return
        setState(detailToEditorState(detail))
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
  }, [props])

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
    setSaveMessage(null)

    try {
      const priorLines = state.lines
      const saved = await saveStockDocumentEditor(state, staffId, priorLines)
      const nextState = detailToEditorState(saved)
      setState(nextState)
      setSaveMessage("Draft saved.")

      const redirect = postSaveEditorPath(props.mode, saved.id)
      if (redirect) {
        router.replace(redirect)
      }
    } catch (err: unknown) {
      setError(toStockDocumentUiError(err).message)
    } finally {
      setSaving(false)
    }
  }, [props, router, staffId, state])

  if (!state) {
    return (
      <StockDocumentEditorView
        state={{
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
        }}
        loading={loading}
        saving={saving}
        error={error}
        saveMessage={saveMessage}
        onHeaderChange={handleHeaderChange}
        onAddLine={handleAddLine}
        onRemoveLine={handleRemoveLine}
        onLineChange={handleLineChange}
        onSave={() => void handleSave()}
      />
    )
  }

  return (
    <StockDocumentEditorView
      state={state}
      loading={loading}
      saving={saving}
      error={error}
      saveMessage={saveMessage}
      onHeaderChange={handleHeaderChange}
      onAddLine={handleAddLine}
      onRemoveLine={handleRemoveLine}
      onLineChange={handleLineChange}
      onSave={() => void handleSave()}
    />
  )
}

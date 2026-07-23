"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import {
  loadCountingEditorStateForCreate,
  loadCountingEditorStateForEdit,
} from "@/lib/stock-ui/counting-editor-load"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
import { filterEditorActionsForStockCountStaff, isStaffOperationalSheet } from "@/lib/stock-ui/stock-count-staff-mode"
import {
  addEditorLine,
  applyCountingSaveToEditorState,
  createDraftEditorState,
  detailToEditorState,
  isCountingEditorMode,
  isShopDocType,
  mergeSavedDetailWithEditorLines,
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
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE, HO_BRANCH_CODE } from "@/lib/legal-entity/constants"
import {
  applyShopSelection,
  getStockDocumentShopSelectionPolicy,
} from "@/lib/stock/document-read/stock-document-shop-selection"
import {
  fetchShopBranchOptions,
  type ShopBranchOption,
} from "@/lib/stock-ui/fetch-shop-branches"
import { StockDocumentEditorView } from "./StockDocumentEditorView"

type CreateProps = {
  mode: "create"
  docType: DocType
  stockCountStaffMode?: boolean
  /** HO creating CNT for a selected Location/Shop. */
  createBranchId?: string
  /** PeriodSelector value YYYY-MM — sets document date into that month. */
  createPeriodKey?: string
}

type EditProps = {
  mode: "edit"
  documentId: string
  stockCountStaffMode?: boolean
}

export type StockDocumentEditorControllerProps = CreateProps | EditProps

function documentDateForPeriodKey(periodKey: string | undefined): string {
  const match = /^(\d{4})-(\d{2})$/.exec(String(periodKey ?? "").trim())
  if (!match) return new Date().toISOString().slice(0, 10)
  const year = Number(match[1])
  const month = Number(match[2])
  // Use mid-month to keep periodMonthFromDate stable across TZ edges.
  return `${year}-${String(month).padStart(2, "0")}-15`
}

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

function orphanWarning(count: number): string {
  return `${count} saved line(s) are not in the current product master and are shown separately.`
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
  const [staffHeader, setStaffHeader] = useState<{
    branchCode: string
    branchName: string
    staffCode: string
    staffName: string
  } | null>(null)
  const [viewerEntityCode, setViewerEntityCode] = useState<DocumentEntityCode>(
    DEFAULT_DOCUMENT_ENTITY_CODE
  )
  const [shopOptions, setShopOptions] = useState<ShopBranchOption[]>([])
  const [hoBranch, setHoBranch] = useState<ShopBranchOption | null>(null)
  const [activeHookGroup, setActiveHookGroup] = useState<CountingHookGroup>("K")

  const stockCountStaffMode = Boolean(props.stockCountStaffMode)

  function resolveHoFromSession(
    session: {
      branchId: string
      branchCode: string
      branchName: string
    },
    shops: readonly ShopBranchOption[]
  ): ShopBranchOption | null {
    if (session.branchCode.trim().toUpperCase() === HO_BRANCH_CODE) {
      return {
        id: session.branchId,
        code: session.branchCode,
        name: session.branchName || "Head Office",
      }
    }
    return (
      shops.find((b) => b.code.trim().toUpperCase() === HO_BRANCH_CODE) ?? null
    )
  }

  const applyDetail = useCallback((detail: StockDocumentDetailVM) => {
    setDetailSnapshot(detail)
    setState(detailToEditorState(detail))
  }, [])

  const actions: StockDocumentActionVM[] = useMemo(() => {
    if (!state || !role) return []
    const base = getEditorWorkflowActions(
      { role, docType: state.docType, status: state.status },
      { hasDocumentId: Boolean(state.documentId) }
    )
    if (stockCountStaffMode) {
      return filterEditorActionsForStockCountStaff(base)
    }
    return base
  }, [role, state, stockCountStaffMode])

  const countingMode = state ? isCountingEditorMode(state) : false
  const staffOperationalSheet =
    state !== null && isStaffOperationalSheet(state, stockCountStaffMode)

  const refreshDocument = useCallback(
    async (documentId: string) => {
      const detail = await fetchStockDocumentDetail(documentId)
      if (detail.docType === "ADJUSTMENT" && detail.status === "DRAFT") {
        const loaded = await loadCountingEditorStateForEdit(detail)
        setDetailSnapshot(detail)
        setState(loaded.state)
        if (loaded.orphans.length > 0) {
          setStatusMessage(orphanWarning(loaded.orphans.length))
        }
        return detail
      }
      if (
        detail.docType === "TRANSFER_OUT" &&
        detail.status === "DRAFT" &&
        stockCountStaffMode
      ) {
        const loaded = await loadCountingEditorStateForEdit(detail)
        setDetailSnapshot(detail)
        setState(loaded.state)
        if (loaded.orphans.length > 0) {
          setStatusMessage(orphanWarning(loaded.orphans.length))
        }
        return detail
      }
      applyDetail(detail)
      return detail
    },
    [applyDetail, stockCountStaffMode]
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
        setViewerEntityCode(session.documentEntityCode)
        setStaffHeader({
          branchCode: session.branchCode,
          branchName: session.branchName,
          staffCode: session.staffId,
          staffName: session.name,
        })

        let shops: ShopBranchOption[] = []
        try {
          shops = await fetchShopBranchOptions()
        } catch {
          shops = []
        }
        const ho = resolveHoFromSession(session, shops)
        if (cancelled) return
        setShopOptions(shops)
        setHoBranch(ho)

        const entityCode = session.documentEntityCode
        const hoId = ho?.id ?? null

        if (props.mode === "create") {
          if (!isShopDocType(props.docType)) {
            throw new Error("Invalid document type for shop editor")
          }

          const periodDate = documentDateForPeriodKey(props.createPeriodKey)
          const policy = getStockDocumentShopSelectionPolicy(
            entityCode,
            props.docType
          )
          const createId = props.createBranchId?.trim() || ""
          let selectedShopId = createId || session.branchId
          if (policy.mapsTo === "to_destination") {
            // ASAD DEY: list/create branch is HO owner — Shop is destination SH.
            selectedShopId =
              createId && createId !== (hoId ?? "")
                ? createId
                : session.branchId !== (hoId ?? "")
                  ? session.branchId
                  : ""
          } else if (policy.optionScope === "ho_only") {
            selectedShopId = hoId || createId || session.branchId
          } else if (selectedShopId === (hoId ?? "")) {
            selectedShopId = createId || ""
          }

          const locationFields = applyShopSelection(selectedShopId, {
            legalEntityCode: entityCode,
            docType: props.docType,
            hoBranchId: hoId,
          })

          if (
            props.docType === "ADJUSTMENT" ||
            (stockCountStaffMode && props.docType === "TRANSFER_OUT")
          ) {
            const loaded = await loadCountingEditorStateForCreate(
              locationFields.branchId || selectedShopId,
              props.docType,
              entityCode
            )
            if (cancelled) return
            setDetailSnapshot(null)
            setState({
              ...loaded.state,
              date: periodDate,
              legalEntityCode: entityCode,
              ...locationFields,
            })
            if (loaded.orphans.length > 0) {
              setStatusMessage(orphanWarning(loaded.orphans.length))
            }
            setLoading(false)
            return
          }

          const draft = createDraftEditorState(
            props.docType,
            locationFields.branchId || selectedShopId,
            entityCode
          )
          setDetailSnapshot(null)
          setState({ ...draft, date: periodDate, ...locationFields })
          setLoading(false)
          return
        }

        const detail = await fetchStockDocumentDetail(props.documentId)
        if (cancelled) return

        if (detail.docType === "ADJUSTMENT" && detail.status === "DRAFT") {
          const loaded = await loadCountingEditorStateForEdit(detail)
          if (cancelled) return
          setDetailSnapshot(detail)
          setState(loaded.state)
          if (loaded.orphans.length > 0) {
            setStatusMessage(orphanWarning(loaded.orphans.length))
          }
          setLoading(false)
          return
        }

        if (
          detail.docType === "TRANSFER_OUT" &&
          detail.status === "DRAFT" &&
          stockCountStaffMode
        ) {
          const loaded = await loadCountingEditorStateForEdit(detail)
          if (cancelled) return
          setDetailSnapshot(detail)
          setState(loaded.state)
          if (loaded.orphans.length > 0) {
            setStatusMessage(orphanWarning(loaded.orphans.length))
          }
          setLoading(false)
          return
        }

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
  }, [applyDetail, props, stockCountStaffMode])

  const handleHeaderChange = useCallback((patch: Partial<StockDocumentEditorStateVM>) => {
    setState((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleAddLine = useCallback(() => {
    setState((prev) =>
      prev && !prev.readOnly && !isCountingEditorMode(prev)
        ? { ...prev, lines: addEditorLine(prev.lines) }
        : prev
    )
  }, [])

  const handleRemoveLine = useCallback((key: string) => {
    setState((prev) =>
      prev && !prev.readOnly && !isCountingEditorMode(prev)
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
      const saved = await saveStockDocumentEditor(state, staffId, priorLines, {
        staffOperationalSheet: staffOperationalSheet,
      })

      if (isCountingEditorMode(state) || staffOperationalSheet) {
        setDetailSnapshot(mergeSavedDetailWithEditorLines(saved, priorLines))
        setState(applyCountingSaveToEditorState(state, saved))
      } else {
        applyDetail(saved)
      }

      setStatusMessage(workflowSuccessMessage("save"))

      const redirect = postSaveEditorPath(props.mode, saved.id, {
        staffEntry: stockCountStaffMode,
      })
      if (redirect) {
        router.replace(redirect)
      }
    } catch (err: unknown) {
      setError(toStockDocumentUiError(err).message)
    } finally {
      setSaving(false)
    }
  }, [applyDetail, props, router, staffId, staffOperationalSheet, state, stockCountStaffMode])

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
    legalEntityCode: viewerEntityCode,
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
      countingMode={countingMode}
      staffOperationalSheet={staffOperationalSheet}
      activeHookGroup={activeHookGroup}
      onHookGroupChange={setActiveHookGroup}
      onHeaderChange={handleHeaderChange}
      onAddLine={handleAddLine}
      onRemoveLine={handleRemoveLine}
      onLineChange={handleLineChange}
      onWorkflowAction={(id) => void handleWorkflowAction(id)}
      stockCountStaffMode={stockCountStaffMode}
      staffHeader={staffHeader}
      viewerEntityCode={viewerEntityCode}
      shopOptions={shopOptions}
      hoBranch={hoBranch}
    />
  )
}

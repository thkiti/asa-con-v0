"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  canImportEnd,
  canLockEnd,
  canRebuildEnd,
  canReopenEnd,
  canSubmitEnd,
} from "@/lib/stock-ui/end-permissions"
import {
  fetchEndDocumentDetail,
  importEndCsv,
  applyEndManualOpening,
  lockEndDocument,
  rebuildEndDocument,
  reopenEndDocument,
  submitEndDocument,
  type EndDocumentDetailVM,
  type ImportEndCsvResultVM,
} from "@/lib/stock-ui/end-fetchers"
import { toStockDocumentUiError } from "@/lib/stock-ui/document-errors"
import { formatStockDocumentPhaseTitle } from "@/lib/stock-ui/business-phase-title"
import { fetchShopSession } from "@/lib/stock-ui/session"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import type { Role } from "@/generated/prisma/client"
import { EndDocumentView, type EndDocumentActionsVM } from "./EndDocumentView"

type EndDocumentControllerProps = {
  documentId: string
}

export function EndDocumentController({ documentId }: EndDocumentControllerProps) {
  const [detail, setDetail] = useState<EndDocumentDetailVM | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [viewerEntityCode, setViewerEntityCode] = useState<DocumentEntityCode>(
    DEFAULT_DOCUMENT_ENTITY_CODE
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportEndCsvResultVM | null>(
    null
  )
  const [pendingCsv, setPendingCsv] = useState<{
    text: string
    fileName: string
  } | null>(null)

  const reload = useCallback(async () => {
    const next = await fetchEndDocumentDetail(documentId)
    setDetail(next)
    return next
  }, [documentId])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const session = await fetchShopSession()
        if (cancelled) return
        setRole(session.role)
        setViewerEntityCode(session.documentEntityCode)
        await reload()
      } catch (err: unknown) {
        if (!cancelled) setError(toStockDocumentUiError(err).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [reload])

  const actions: EndDocumentActionsVM = useMemo(() => {
    const r = role ?? ""
    return {
      canRebuild: canRebuildEnd(r),
      canSubmit: canSubmitEnd(r),
      canLock: canLockEnd(r),
      canReopen: canReopenEnd(r),
      canImport: canImportEnd(r),
    }
  }, [role])

  const title = useMemo(() => {
    if (!detail) return "END"
    const entityCode =
      parseDocumentEntityCode(detail.legalEntityCode) ?? viewerEntityCode
    return formatStockDocumentPhaseTitle({
      docType: "END",
      status: (detail.status as "DRAFT") || "DRAFT",
      viewerEntityCode: entityCode,
    })
  }, [detail, viewerEntityCode])

  async function runAction(
    key: string,
    fn: () => Promise<void>,
    successMessage: string
  ) {
    setBusy(key)
    setError(null)
    setStatusMessage(null)
    try {
      await fn()
      setStatusMessage(successMessage)
    } catch (err: unknown) {
      setError(toStockDocumentUiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  if (loading && !detail) {
    return <p className="text-sm text-secondary">Loading END document…</p>
  }

  if (!detail) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error ?? "END document not found."}
      </p>
    )
  }

  return (
    <EndDocumentView
      title={title}
      detail={detail}
      actions={actions}
      busy={busy}
      error={error}
      statusMessage={statusMessage}
      importPreview={importPreview}
      onRebuild={() =>
        void runAction(
          "rebuild",
          async () => {
            await rebuildEndDocument(documentId)
            await reload()
            setImportPreview(null)
            setPendingCsv(null)
          },
          "Sources rebuilt."
        )
      }
      onSubmit={() =>
        void runAction(
          "submit",
          async () => {
            await submitEndDocument(documentId)
            await reload()
          },
          "Submitted for review."
        )
      }
      onLock={() =>
        void runAction(
          "lock",
          async () => {
            await lockEndDocument(documentId)
            await reload()
          },
          "END locked."
        )
      }
      onReopen={() => {
        const reason = window.prompt("Reopen reason (required):")
        if (reason == null) return
        if (!reason.trim()) {
          setError("Reopen reason is required.")
          return
        }
        void runAction(
          "reopen",
          async () => {
            await reopenEndDocument(documentId, reason.trim())
            await reload()
          },
          "END reopened."
        )
      }}
      onImportFile={(file) => {
        void runAction(
          "import-preview",
          async () => {
            const csvText = await file.text()
            const preview = await importEndCsv(documentId, {
              csvText,
              mode: "preview",
              fileName: file.name,
            })
            setPendingCsv({ text: csvText, fileName: file.name })
            setImportPreview(preview)
          },
          "Import preview ready."
        )
      }}
      onApplyImport={() => {
        if (!pendingCsv) {
          setError("Load a CSV preview before applying.")
          return
        }
        void runAction(
          "import-apply",
          async () => {
            await importEndCsv(documentId, {
              csvText: pendingCsv.text,
              mode: "apply",
              fileName: pendingCsv.fileName,
            })
            await reload()
            setImportPreview(null)
            setPendingCsv(null)
          },
          "CSV import applied."
        )
      }}
      onClearImportPreview={() => {
        setImportPreview(null)
        setPendingCsv(null)
      }}
      onSaveManualOpening={(lines) => {
        void runAction(
          "manual-opening",
          async () => {
            await applyEndManualOpening(documentId, lines)
            await reload()
          },
          "Opening lines saved."
        )
      }}
    />
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ReceiptBlockEditor } from "@/components/admin/ReceiptBlockEditor"
import { ReceiptInfoBlockFontEditor } from "@/components/admin/ReceiptInfoBlockFontEditor"
import { ReceiptSetupPrintSampleButton } from "@/components/admin/ReceiptSetupPrintSampleButton"
import { fetchReceiptSetupBranches } from "@/lib/admin-ui/receipt-setup-branches-client"
import {
  blockLayoutDraftFromView,
  blockLayoutInputFromDraft,
} from "@/lib/admin-ui/receipt-layout-draft"
import {
  formatReceiptSetupBranchLabel,
  type ReceiptSetupBranchOption,
} from "@/lib/admin-ui/receipt-setup-preview"
import { patchThermalDocumentLayout } from "@/lib/admin-ui/thermal-layout-client"
import type { ThermalDocumentLayoutView, ThermalDocumentType } from "@/lib/thermal/types"
import {
  THERMAL_COLUMNS,
  THERMAL_PRINTABLE_WIDTH_MM,
  THERMAL_PAPER_WIDTH_MM,
} from "@/lib/thermal/thermal-paper"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeMuted,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type TicketBlockLayoutSetupPanelProps = {
  title: string
  documentType: ThermalDocumentType
  printSampleKind: string
  initialLayout: ThermalDocumentLayoutView
  onSaved: (layout: ThermalDocumentLayoutView) => void
  renderPreview: (input: {
    draft: ThermalDocumentLayoutView
    branch: ReceiptSetupBranchOption
    companyTaxId: string | null
  }) => ReactNode
}

export function TicketBlockLayoutSetupPanel({
  title,
  documentType,
  printSampleKind,
  initialLayout,
  onSaved,
  renderPreview,
}: TicketBlockLayoutSetupPanelProps) {
  const [draft, setDraft] = useState(() => blockLayoutDraftFromView(initialLayout))
  const [branches, setBranches] = useState<ReceiptSetupBranchOption[]>([])
  const [companyTaxId, setCompanyTaxId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(blockLayoutDraftFromView(initialLayout))
    setSaved(false)
  }, [initialLayout])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBranchesLoading(true)
      const result = await fetchReceiptSetupBranches()
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        setBranchesLoading(false)
        return
      }
      setBranches(result.branches)
      setCompanyTaxId(result.companyTaxId)
      setSelectedBranchId((prev) => {
        if (prev && result.branches.some((b) => b.id === prev)) return prev
        return result.branches[0]?.id ?? ""
      })
      setBranchesLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? null

  const previewContext = useMemo(() => {
    if (!selectedBranch) return null
    return { draft, branch: selectedBranch, companyTaxId }
  }, [draft, selectedBranch, companyTaxId])

  const printSampleSlip = useMemo(() => {
    if (!previewContext) return null
    return renderPreview(previewContext)
  }, [previewContext, renderPreview])

  const onSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await patchThermalDocumentLayout(
        documentType,
        blockLayoutInputFromDraft(draft)
      )
      const normalized = blockLayoutDraftFromView(result.layout)
      setDraft(normalized)
      onSaved(result.layout)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }, [documentType, draft, onSaved])

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className={`${themeCard} space-y-3 p-4`}>
        <h2 className={themePageTitle}>{title}</h2>
        <p className={`text-xs ${themeMuted}`}>
          Header, sub-header, and footer support line breaks. Body content is unchanged — only
          layout blocks and preview typography are editable here.
        </p>

        <ReceiptBlockEditor
          label="Header"
          text={draft.headerBlockText ?? ""}
          fontSizePx={draft.headerFontSize}
          bold={draft.headerBlockBold}
          disabled={saving}
          onTextChange={(value) =>
            setDraft((prev) => ({ ...prev, headerBlockText: value || null }))
          }
          onFontSizeChange={(size) =>
            setDraft((prev) => ({ ...prev, headerFontSize: size }))
          }
          onBoldChange={(bold) =>
            setDraft((prev) => ({ ...prev, headerBlockBold: bold }))
          }
        />

        <ReceiptBlockEditor
          label="Sub-header"
          text={draft.subHeaderBlockText ?? ""}
          fontSizePx={draft.subHeaderFontSize}
          bold={draft.subHeaderBlockBold}
          disabled={saving}
          onTextChange={(value) =>
            setDraft((prev) => ({ ...prev, subHeaderBlockText: value || null }))
          }
          onFontSizeChange={(size) =>
            setDraft((prev) => ({ ...prev, subHeaderFontSize: size }))
          }
          onBoldChange={(bold) =>
            setDraft((prev) => ({ ...prev, subHeaderBlockBold: bold }))
          }
        />

        <ReceiptInfoBlockFontEditor
          fontSizePx={draft.infoBlockFontSize}
          bold={draft.infoBlockBold}
          disabled={saving}
          onFontSizeChange={(size) =>
            setDraft((prev) => ({ ...prev, infoBlockFontSize: size }))
          }
          onBoldChange={(bold) =>
            setDraft((prev) => ({ ...prev, infoBlockBold: bold }))
          }
        />

        <ReceiptBlockEditor
          label="Footer"
          rows={4}
          text={draft.footerBlockText ?? ""}
          fontSizePx={draft.footerFontSize}
          bold={draft.footerBlockBold}
          disabled={saving}
          onTextChange={(value) =>
            setDraft((prev) => ({ ...prev, footerBlockText: value || null }))
          }
          onFontSizeChange={(size) =>
            setDraft((prev) => ({ ...prev, footerFontSize: size }))
          }
          onBoldChange={(bold) =>
            setDraft((prev) => ({ ...prev, footerBlockBold: bold }))
          }
        />

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-green-700" role="status">
            Saved.
          </p>
        ) : null}

        <button
          type="button"
          className={themeBtnPrimary}
          onClick={() => void onSave()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className={`${themeCard} p-4`}>
        <h2 className={themePageTitle}>Preview</h2>
        <p className={`mt-1 text-xs ${themeMuted}`}>
          {THERMAL_PAPER_WIDTH_MM}mm paper · {THERMAL_PRINTABLE_WIDTH_MM}mm printable ·{" "}
          {THERMAL_COLUMNS} monospace columns
        </p>

        <label className="mt-3 block">
          <span className="text-sm text-muted-foreground">Shop</span>
          <select
            className={`${themeInput} mt-1`}
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
            disabled={branchesLoading || branches.length === 0}
            data-testid={`${documentType.toLowerCase()}-setup-shop-select`}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatReceiptSetupBranchLabel(branch)}
              </option>
            ))}
          </select>
        </label>

        <div className="receipt-setup-preview mt-3">
          {branchesLoading ? (
            <p className={`text-sm ${themeMuted}`}>Loading shops…</p>
          ) : previewContext ? (
            renderPreview(previewContext)
          ) : (
            <p className={`text-sm ${themeMuted}`}>No shop branches available for preview.</p>
          )}
        </div>

        <div className="mt-3">
          <ReceiptSetupPrintSampleButton
            kind={printSampleKind}
            sampleSlip={printSampleSlip}
            disabled={branchesLoading || !selectedBranch}
          />
        </div>
      </div>
    </div>
  )
}

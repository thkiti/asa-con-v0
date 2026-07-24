"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ReceiptBlockEditor } from "@/components/admin/ReceiptBlockEditor"
import { ReceiptInfoBlockFontEditor } from "@/components/admin/ReceiptInfoBlockFontEditor"
import { ReceiptSetupPreview } from "@/components/admin/ReceiptSetupPreview"
import { ReceiptSetupPrintSampleButton } from "@/components/admin/ReceiptSetupPrintSampleButton"
import { RefundSetupPreview } from "@/components/admin/RefundSetupPreview"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { fetchReceiptSetupBranches } from "@/lib/admin-ui/receipt-setup-branches-client"
import {
  blockLayoutDraftFromView,
  blockLayoutInputFromDraft,
} from "@/lib/admin-ui/receipt-layout-draft"
import {
  buildReceiptSetupTicketLayout,
  formatReceiptSetupBranchLabel,
  type ReceiptSetupBranchOption,
} from "@/lib/admin/receipt-setup-preview"
import { patchThermalDocumentLayout } from "@/lib/admin-ui/thermal-layout-client"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeMuted,
  themePageTitle,
} from "@/lib/theme/theme-classes"

type ReceiptLayoutSetupPanelProps = {
  initialLayout: ThermalDocumentLayoutView
  onSaved: (layout: ThermalDocumentLayoutView) => void
}

export function ReceiptLayoutSetupPanel({
  initialLayout,
  onSaved,
}: ReceiptLayoutSetupPanelProps) {
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

  const ticketLayout = useMemo(() => {
    if (!selectedBranch) return null
    return buildReceiptSetupTicketLayout({
      branch: selectedBranch,
      companyTaxId,
      layout: draft,
    })
  }, [selectedBranch, companyTaxId, draft])

  const printSampleSlip = useMemo(() => {
    if (!ticketLayout) return null
    return <ReceiptSetupPreview layout={ticketLayout} />
  }, [ticketLayout])

  const onSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await patchThermalDocumentLayout("RECEIPT", blockLayoutInputFromDraft(draft))
      const normalized = blockLayoutDraftFromView(result.layout)
      setDraft(normalized)
      onSaved(result.layout)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved])

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className={`${themeCard} space-y-3 p-4`}>
        <h2 className={themePageTitle}>Receipt layout</h2>
        <p className={`text-xs ${themeMuted}`}>
          Header, sub-header, and footer support line breaks. Font controls affect preview and
          print only.
        </p>

        <ReceiptBlockEditor
          label="Header"
          text={draft.headerBlockText ?? ""}
          fontSizePx={draft.headerFontSize}
          bold={draft.headerBlockBold}
          disabled={saving}
          onTextChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              headerBlockText: value || null,
            }))
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
            setDraft((prev) => ({
              ...prev,
              subHeaderBlockText: value || null,
            }))
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
            setDraft((prev) => ({
              ...prev,
              footerBlockText: value || null,
            }))
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={themeBtnPrimary}
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className={`${themeCard} p-4`}>
        <h2 className={themePageTitle}>Preview</h2>
        <p className={`mt-1 text-xs ${themeMuted}`}>
          80mm paper · 72mm printable · sample slip using live shop data.
        </p>

        <BranchSelect
          label="Shop"
          labelClassName="text-sm text-muted-foreground"
          wrapperClassName="mt-3 block"
          selectClassName={`${themeInput} mt-1`}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          options={branches}
          formatOptionLabel={(option) =>
            formatReceiptSetupBranchLabel(option as ReceiptSetupBranchOption)
          }
          disabled={branchesLoading || branches.length === 0}
          loading={branchesLoading}
          data-testid="receipt-setup-shop-select"
        />

        <div className="receipt-setup-preview mt-3">
          {branchesLoading ? (
            <p className={`text-sm ${themeMuted}`}>Loading shops…</p>
          ) : ticketLayout ? (
            <ReceiptSetupPreview layout={ticketLayout} />
          ) : (
            <p className={`text-sm ${themeMuted}`}>No shop branches available for preview.</p>
          )}
        </div>

        <div className="mt-3">
          <ReceiptSetupPrintSampleButton
            kind="receipt-setup-receipt"
            sampleSlip={printSampleSlip}
            disabled={branchesLoading || !selectedBranch}
          />
        </div>
      </div>
    </div>
  )
}

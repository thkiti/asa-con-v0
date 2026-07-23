"use client"

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInput,
  themeMuted,
} from "@/lib/theme/theme-classes"

export type ManualOpeningDraftLine = {
  key: string
  productCode: string
  beginQty: string
  countQty: string
}

type EndManualOpeningPanelProps = {
  disabled?: boolean
  busy?: boolean
  onSave: (lines: Array<{
    productCode: string
    beginQty: number
    countQty: number | null
  }>) => void
}

function newDraftLine(): ManualOpeningDraftLine {
  return {
    key: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productCode: "",
    beginQty: "",
    countQty: "",
  }
}

/**
 * Paper entry for first-period END BEGIN (+ optional physical COUNT).
 * Labels distinguish Opening Qty vs Physical Count Qty.
 */
export function EndManualOpeningPanel({
  disabled = false,
  busy = false,
  onSave,
}: EndManualOpeningPanelProps) {
  const [draft, setDraft] = useState<ManualOpeningDraftLine>(newDraftLine())
  const [pending, setPending] = useState<ManualOpeningDraftLine[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  function addCurrentLine() {
    setLocalError(null)
    const productCode = draft.productCode.trim().toUpperCase()
    if (!productCode) {
      setLocalError("Product Code is required.")
      codeRef.current?.focus()
      return
    }
    if (!/^-?\d+$/.test(draft.beginQty.trim())) {
      setLocalError("Opening Qty (BEGIN) must be an integer.")
      return
    }
    if (draft.countQty.trim() && !/^-?\d+$/.test(draft.countQty.trim())) {
      setLocalError("Physical Count Qty must be an integer when provided.")
      return
    }
    if (
      pending.some((p) => p.productCode.trim().toUpperCase() === productCode)
    ) {
      setLocalError("Duplicate Product Code in the pending list.")
      return
    }

    setPending((prev) => [
      ...prev,
      {
        ...draft,
        productCode,
        key: draft.key,
      },
    ])
    setDraft(newDraftLine())
    queueMicrotask(() => codeRef.current?.focus())
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    addCurrentLine()
  }

  function handleCodeKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      // Move to opening qty
      const form = e.currentTarget.form
      const begin = form?.querySelector<HTMLInputElement>(
        '[data-testid="end-manual-begin-qty"]'
      )
      begin?.focus()
      begin?.select()
    }
  }

  function handleBeginKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addCurrentLine()
    }
  }

  function handleSaveAll() {
    setLocalError(null)
    const working = [...pending]
    // Include current draft if filled
    if (draft.productCode.trim() || draft.beginQty.trim()) {
      const productCode = draft.productCode.trim().toUpperCase()
      if (!productCode || !/^-?\d+$/.test(draft.beginQty.trim())) {
        setLocalError("Finish or clear the current line before saving.")
        return
      }
      working.push({ ...draft, productCode })
    }
    if (working.length === 0) {
      setLocalError("Add at least one opening line.")
      return
    }
    onSave(
      working.map((line) => ({
        productCode: line.productCode.trim().toUpperCase(),
        beginQty: Number(line.beginQty.trim()),
        countQty: line.countQty.trim()
          ? Number(line.countQty.trim())
          : null,
      }))
    )
  }

  return (
    <section
      className="rounded border border-border bg-card p-3"
      data-testid="end-manual-opening-panel"
    >
      <h2 className="text-sm font-semibold">Paper entry — Opening stock (2026-01)</h2>
      <p className={`mt-1 text-sm ${themeMuted}`}>
        Enter opening quantities from paper.{" "}
        <strong>Opening Qty (BEGIN)</strong> is stock at period start.{" "}
        <strong>Physical Count Qty</strong> is optional end-of-period count (prefer
        a posted CNT document when available). CSV import remains optional.
      </p>

      <form className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]" onSubmit={handleSubmit}>
        <label className="flex min-w-0 flex-col text-xs">
          <span className={themeMuted}>Product Code</span>
          <input
            ref={codeRef}
            className={themeInput}
            value={draft.productCode}
            disabled={disabled || busy}
            onChange={(e) =>
              setDraft((d) => ({ ...d, productCode: e.target.value }))
            }
            onKeyDown={handleCodeKeyDown}
            data-testid="end-manual-product-code"
            autoComplete="off"
          />
        </label>
        <label className="flex min-w-0 flex-col text-xs">
          <span className={themeMuted}>Opening Qty (BEGIN)</span>
          <input
            className={themeInput}
            inputMode="numeric"
            value={draft.beginQty}
            disabled={disabled || busy}
            onChange={(e) => setDraft((d) => ({ ...d, beginQty: e.target.value }))}
            onKeyDown={handleBeginKeyDown}
            data-testid="end-manual-begin-qty"
          />
        </label>
        <label className="flex min-w-0 flex-col text-xs">
          <span className={themeMuted}>Physical Count Qty (optional)</span>
          <input
            className={themeInput}
            inputMode="numeric"
            value={draft.countQty}
            disabled={disabled || busy}
            onChange={(e) => setDraft((d) => ({ ...d, countQty: e.target.value }))}
            data-testid="end-manual-count-qty"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className={themeBtnSecondary}
            disabled={disabled || busy}
            data-testid="end-manual-add-line"
          >
            Add line
          </button>
        </div>
      </form>

      {localError ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}

      {pending.length > 0 ? (
        <div className="mt-3 overflow-auto rounded border border-border">
          <table className="min-w-[420px] w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-2 py-1">Product Code</th>
                <th className="px-2 py-1 text-right">Opening Qty</th>
                <th className="px-2 py-1 text-right">Physical Count</th>
                <th className="px-2 py-1 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {pending.map((line) => (
                <tr key={line.key} className="border-b border-border/60">
                  <td className="px-2 py-1 font-mono text-xs">{line.productCode}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{line.beginQty}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {line.countQty.trim() || "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      className="text-xs underline"
                      disabled={disabled || busy}
                      onClick={() =>
                        setPending((prev) => prev.filter((p) => p.key !== line.key))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          className={themeBtnPrimary}
          disabled={disabled || busy}
          onClick={handleSaveAll}
          data-testid="end-manual-save"
        >
          {busy ? "Saving…" : "Save opening lines"}
        </button>
      </div>
    </section>
  )
}

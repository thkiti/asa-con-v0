"use client"

import Link from "next/link"
import { PosBarcodeCapture } from "./PosBarcodeCapture"
import { PosKeypadGrid } from "./PosKeypadGrid"
import { PosPlaceholderOverlay } from "./PosPlaceholderOverlay"
import { PosReceiptPanel } from "./PosReceiptPanel"
import { PosSessionBanner } from "./PosSessionBanner"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"

type PosShellProps = {
  session: PosTerminalSession
  barcode: string
  onBarcodeChange: (value: string) => void
  onKeypadAction: (id: PosKeypadActionId) => void
  placeholderOverlay: PosPlaceholderId | null
  onClosePlaceholder: () => void
  keypadDisabled?: boolean
}

export function PosShell({
  session,
  barcode,
  onBarcodeChange,
  onKeypadAction,
  placeholderOverlay,
  onClosePlaceholder,
  keypadDisabled = false,
}: PosShellProps) {
  const muted = keypadDisabled || !!placeholderOverlay

  return (
    <div className="fixed inset-0 flex bg-white">
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex h-full w-full min-h-0 max-w-[1200px] flex-col gap-3">
          <PosSessionBanner session={session} />

          <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-zinc-500 bg-gradient-to-b from-zinc-100 to-zinc-300 p-3 shadow-sm">
            <div className="flex items-center justify-center py-1">
              <span className="text-center text-[28px] font-semibold leading-none tracking-wide text-zinc-900 sm:text-[36px]">
                ASA • POS TERMINAL
              </span>
            </div>
            <PosBarcodeCapture
              value={barcode}
              onChange={onBarcodeChange}
              disabled={muted}
            />
          </div>

          <div className="min-h-0 flex-1 rounded-xl border border-zinc-500 bg-gradient-to-b from-slate-200 to-slate-300 p-3 shadow-inner">
            <PosKeypadGrid onAction={onKeypadAction} disabled={muted} />
          </div>

          <footer className="shrink-0 text-center text-xs text-zinc-600">
            <Link
              href="/shop/stock-documents"
              className="font-medium text-zinc-800 underline-offset-2 hover:underline"
            >
              Stock documents
            </Link>
          </footer>
        </div>
      </div>

      <PosReceiptPanel
        session={session}
        overlay={
          placeholderOverlay ? (
            <PosPlaceholderOverlay
              placeholderId={placeholderOverlay}
              onClose={onClosePlaceholder}
            />
          ) : null
        }
      />
    </div>
  )
}

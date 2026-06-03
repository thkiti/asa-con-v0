import type { PosTerminalSession } from "@/lib/pos-ui/types"
import type { ReactNode } from "react"

type PosReceiptPanelProps = {
  session: PosTerminalSession
  overlay?: ReactNode
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PosReceiptPanel({ session, overlay }: PosReceiptPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-l border-orange-800 bg-orange-600 text-white">
      {overlay}

      <div className="shrink-0 space-y-1 border-b border-white/30 p-3 text-center">
        <div className="text-sm font-bold">
          ASA SERVICES{" "}
          <span className="text-xs font-normal">
            ({session.branchCode} • {session.branchName})
          </span>
        </div>
        <div className="border-t border-white/30 pt-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <span>Staff ID</span>
            <span className="font-mono tabular-nums">{session.staffId}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Staff name</span>
            <span className="truncate text-right">{session.name}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div className="mb-1 grid grid-cols-[1fr_72px_96px] border-b border-white/40 pb-1 text-xs font-semibold">
          <div>Name</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Amount</div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-white/80">
          No items — scan products in Phase 2
        </div>
      </div>

      <div className="shrink-0 border-t border-white/30 bg-orange-700 p-3">
        <div className="flex flex-col gap-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(0)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT 7%</span>
            <span className="tabular-nums">{formatMoney(0)}</span>
          </div>
          <div className="flex justify-between border-t border-white/35 pt-2 text-lg">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatMoney(0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

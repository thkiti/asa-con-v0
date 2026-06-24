"use client"

import type { CSSProperties, ReactNode } from "react"
import { TicketSetupCustomerAckSection } from "@/components/admin/TicketSetupCustomerAckSection"
import {
  ReceiptSlipIdentityBlock,
  ReceiptSlipProportionalBlock,
  ReceiptSlipRefStaffBlock,
} from "@/components/thermal/ReceiptSlipFontRegions"
import { ThermalTicketTextBody } from "@/components/thermal/ThermalTicketTextBody"
import type { ThermalTicketLayout } from "@/lib/thermal/ticket-layout-types"
import { THERMAL_PAPER_CSS_VARS } from "@/lib/thermal/thermal-paper"

type ThermalTicketSlipViewProps = {
  layout: ThermalTicketLayout
  testId?: string
  /** Admin preview frame with paper border; print/POS uses bare slip. */
  framed?: boolean
  bodyOverride?: ReactNode
  ackOverride?: ReactNode
  ariaHiddenBlocks?: boolean
}

export function ThermalTicketSlipView({
  layout,
  testId,
  framed = false,
  bodyOverride,
  ackOverride,
  ariaHiddenBlocks = false,
}: ThermalTicketSlipViewProps) {
  const slipClass = framed
    ? "receipt-setup-preview-slip receipt-setup-structured-preview thermal-ticket-slip"
    : "thermal-ticket-slip receipt-setup-structured-preview"

  return (
    <div
      className={slipClass}
      style={THERMAL_PAPER_CSS_VARS as CSSProperties}
      data-testid={testId}
    >
      <div className="receipt-setup-printable-inner">
        <ReceiptSlipProportionalBlock
          lines={layout.headerLines}
          fontSizePx={layout.headerFontSize}
          bold={layout.headerBold}
          className="receipt-setup-header-block text-zinc-900"
          testId="thermal-ticket-header"
          ariaHidden={ariaHiddenBlocks || undefined}
        />

        <div className="receipt-setup-body space-y-1 py-1">
          <ReceiptSlipIdentityBlock
            beforeMachineLines={layout.identityBeforeMachineLines}
            machineTaxId={layout.machineTaxId}
            afterMachineLines={layout.identityAfterMachineLines}
            fontSizePx={layout.infoBlockFontSize}
            bold={layout.infoBlockBold}
          />

          {layout.refStaff ? (
            <ReceiptSlipRefStaffBlock
              {...layout.refStaff}
              fontSizePx={layout.infoBlockFontSize}
              bold={layout.infoBlockBold}
            />
          ) : null}

          <ReceiptSlipProportionalBlock
            lines={layout.subHeaderLines}
            fontSizePx={layout.subHeaderFontSize}
            bold={layout.subHeaderBold}
            className="receipt-setup-subheader-block text-zinc-900"
            testId="thermal-ticket-subheader"
            ariaHidden={ariaHiddenBlocks || undefined}
          />

          {bodyOverride ?? <ThermalTicketTextBody text={layout.bodyText} />}
        </div>

        <ReceiptSlipProportionalBlock
          lines={layout.footerLines}
          fontSizePx={layout.footerFontSize}
          bold={layout.footerBold}
          className="receipt-setup-footer-block mt-1 text-zinc-900"
          testId="thermal-ticket-footer"
          ariaHidden={ariaHiddenBlocks || undefined}
        />

        {layout.showCustomerAck
          ? ackOverride ?? <TicketSetupCustomerAckSection />
          : null}
      </div>
    </div>
  )
}

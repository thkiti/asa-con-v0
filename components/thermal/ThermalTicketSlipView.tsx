"use client"

import type { CSSProperties, ReactNode } from "react"
import { TicketSetupCustomerAckSection } from "@/components/admin/TicketSetupCustomerAckSection"
import {
  ReceiptSlipIdentityBlock,
  ReceiptSlipInfoBlock,
  ReceiptSlipProportionalBlock,
  ReceiptSlipRefStaffBlock,
  ReceiptSlipStructuredInfoBlock,
} from "@/components/thermal/ReceiptSlipFontRegions"
import { RefundTicketReasonBlock } from "@/components/thermal/RefundTicketReasonBlock"
import { RepairTicketPhotoList } from "@/components/thermal/RepairTicketPhotoList"
import { ReadZGroupTable } from "@/components/thermal/ReadZGroupTable"
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
  const slipClass = [
    framed
      ? "receipt-setup-preview-slip receipt-setup-structured-preview thermal-ticket-slip"
      : "thermal-ticket-slip receipt-setup-structured-preview",
    layout.readZGroupLines ? "thermal-ticket-slip-read-z" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className={slipClass}
      style={THERMAL_PAPER_CSS_VARS as CSSProperties}
      data-testid={testId}
    >
      <div className="receipt-setup-printable-inner readZTicketPrintableInner">
        {layout.readZGroupLines ? (
          <>
            <div className="readZTicketHeader">
              <ReceiptSlipProportionalBlock
                lines={layout.headerLines}
                fontSizePx={layout.headerFontSize}
                bold={layout.headerBold}
                className="receipt-setup-header-block text-zinc-900"
                testId="thermal-ticket-header"
                ariaHidden={ariaHiddenBlocks || undefined}
              />

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

              {layout.infoBlockRows?.length ? (
                <ReceiptSlipStructuredInfoBlock
                  rows={layout.infoBlockRows}
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
            </div>

            <ReadZGroupTable rows={layout.readZGroupLines} />

            {bodyOverride ?? (layout.bodyText.trim() ? (
              <div className="readZTicketTotals">
                <ThermalTicketTextBody text={layout.bodyText} />
              </div>
            ) : null)}

            <ReceiptSlipProportionalBlock
              lines={layout.footerLines}
              fontSizePx={layout.footerFontSize}
              bold={layout.footerBold}
              className="receipt-setup-footer-block mt-1 text-zinc-900"
              testId="thermal-ticket-footer"
              ariaHidden={ariaHiddenBlocks || undefined}
            />

            {layout.showCustomerAck
              ? ackOverride ?? (
                  <TicketSetupCustomerAckSection
                    showWritingGuides={layout.customerAckWritingGuides !== false}
                    phoneLabel={layout.customerAckPhoneLabel}
                    signLabel={layout.customerAckSignLabel}
                    leadingDivider={layout.customerAckLeadingDivider !== false}
                    leadingBlank={layout.customerAckLeadingBlank === true}
                    inlineWritingGuide={layout.customerAckInlineGuides === true}
                    stackedWritingGuide={layout.customerAckStackedGuides === true}
                    bodyIndent={layout.customerAckBodyIndent === true}
                    cutSeparator={layout.customerAckCutSeparator === true}
                    cutLine={layout.customerAckCutLine === true}
                    trailingSpace={layout.customerAckTrailingSpace === true}
                    fontSizePx={layout.infoBlockFontSize}
                    bold={layout.infoBlockBold}
                  />
                )
              : null}
          </>
        ) : (
          <>
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

              {layout.infoBlockRows?.length ? (
                <ReceiptSlipStructuredInfoBlock
                  rows={layout.infoBlockRows}
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

              {layout.refundReason !== undefined ? (
                <RefundTicketReasonBlock reason={layout.refundReason} />
              ) : null}

              {!layout.summaryAfterBody && layout.summaryRows?.length ? (
                <ReceiptSlipInfoBlock
                  rows={layout.summaryRows}
                  fontSizePx={layout.infoBlockFontSize}
                  bold={layout.infoBlockBold}
                />
              ) : null}

              {bodyOverride ?? (layout.bodyText.trim() ? (
                <ThermalTicketTextBody text={layout.bodyText} />
              ) : null)}

              {layout.repairPhotoFileNames?.length ? (
                <RepairTicketPhotoList fileNames={layout.repairPhotoFileNames} />
              ) : null}

              {layout.summaryAfterBody && layout.summaryRows?.length ? (
                <ReceiptSlipInfoBlock
                  rows={layout.summaryRows}
                  fontSizePx={layout.infoBlockFontSize}
                  bold={layout.infoBlockBold}
                />
              ) : null}
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
              ? ackOverride ?? (
                  <TicketSetupCustomerAckSection
                    showWritingGuides={layout.customerAckWritingGuides !== false}
                    phoneLabel={layout.customerAckPhoneLabel}
                    signLabel={layout.customerAckSignLabel}
                    leadingDivider={layout.customerAckLeadingDivider !== false}
                    leadingBlank={layout.customerAckLeadingBlank === true}
                    inlineWritingGuide={layout.customerAckInlineGuides === true}
                    stackedWritingGuide={layout.customerAckStackedGuides === true}
                    bodyIndent={layout.customerAckBodyIndent === true}
                    cutSeparator={layout.customerAckCutSeparator === true}
                    cutLine={layout.customerAckCutLine === true}
                    trailingSpace={layout.customerAckTrailingSpace === true}
                    fontSizePx={layout.infoBlockFontSize}
                    bold={layout.infoBlockBold}
                  />
                )
              : null}
          </>
        )}
      </div>
    </div>
  )
}

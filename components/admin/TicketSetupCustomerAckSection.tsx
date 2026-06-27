"use client"

import {
  THERMAL_ACK_PHONE_WRITING_LINES,
  THERMAL_ACK_SIGN_WRITING_LINES,
} from "@/lib/thermal/thermal-customer-ack"
import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import { RECEIPT_SLIP_PROPORTIONAL_CLASS } from "@/lib/thermal/receipt-slip-fonts"
import {
  TicketSetupAckField,
  TicketSetupDivider,
  TicketSetupDottedLine,
} from "@/components/admin/TicketSetupPreviewPrimitives"

type TicketSetupCustomerAckSectionProps = {
  testId?: string
  phoneTestId?: string
  signTestId?: string
  showWritingGuides?: boolean
  phoneLabel?: string
  signLabel?: string
  leadingDivider?: boolean
  leadingBlank?: boolean
  inlineWritingGuide?: boolean
  stackedWritingGuide?: boolean
  bodyIndent?: boolean
  cutLine?: boolean
  cutSeparator?: boolean
  trailingSpace?: boolean
  fontSizePx?: ReceiptBlockFontPx
  bold?: boolean
}

export function TicketSetupCustomerAckSection({
  testId = "ticket-setup-ack-section",
  phoneTestId = "ticket-setup-phone-field",
  signTestId = "ticket-setup-sign-field",
  showWritingGuides = true,
  phoneLabel = "Phone No",
  signLabel = "Sign",
  leadingDivider = true,
  leadingBlank = false,
  inlineWritingGuide = false,
  stackedWritingGuide = false,
  bodyIndent = false,
  cutLine = false,
  cutSeparator = false,
  trailingSpace = false,
  fontSizePx,
  bold = true,
}: TicketSetupCustomerAckSectionProps) {
  const sectionClass = bodyIndent
    ? `${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-setup-ack-body-indent`
    : "receipt-setup-mono-body"

  const sectionStyle =
    bodyIndent && fontSizePx != null
      ? { fontSize: `${fontSizePx}px`, fontWeight: bold ? 700 : 400 }
      : undefined

  return (
    <div
      className={`receipt-setup-ack-section ${sectionClass} mt-2 space-y-2`}
      style={sectionStyle}
      data-testid={testId}
    >
      {leadingDivider ? <TicketSetupDivider /> : null}
      {leadingBlank ? (
        <div className="receipt-setup-ack-leading-blank h-1" aria-hidden data-testid="ticket-setup-ack-leading-blank" />
      ) : null}
      <TicketSetupAckField
        label={phoneLabel}
        writingLines={THERMAL_ACK_PHONE_WRITING_LINES}
        showWritingGuides={showWritingGuides}
        inlineGuide={inlineWritingGuide}
        stackedGuide={stackedWritingGuide}
        testId={phoneTestId}
      />
      <TicketSetupAckField
        label={signLabel}
        writingLines={THERMAL_ACK_SIGN_WRITING_LINES}
        showWritingGuides={showWritingGuides}
        inlineGuide={inlineWritingGuide}
        stackedGuide={stackedWritingGuide}
        testId={signTestId}
      />
      {cutSeparator ? (
        <>
          <div className="receipt-setup-ack-leading-blank h-1" aria-hidden />
          <TicketSetupDivider testId="ticket-setup-ack-cut-separator" />
        </>
      ) : null}
      {cutLine && showWritingGuides && !cutSeparator ? (
        <TicketSetupDottedLine testId="ticket-setup-ack-cut-line" />
      ) : null}
      {trailingSpace ? (
        <div
          className="receipt-setup-ack-trailing-space"
          aria-hidden
          data-testid="ticket-setup-ack-trailing-space"
        />
      ) : null}
    </div>
  )
}

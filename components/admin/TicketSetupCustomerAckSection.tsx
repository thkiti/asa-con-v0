"use client"

import {
  THERMAL_ACK_PHONE_WRITING_LINES,
  THERMAL_ACK_SIGN_WRITING_LINES,
} from "@/lib/thermal/thermal-customer-ack"
import {
  TicketSetupAckField,
  TicketSetupDivider,
} from "@/components/admin/TicketSetupPreviewPrimitives"

type TicketSetupCustomerAckSectionProps = {
  testId?: string
  phoneTestId?: string
  signTestId?: string
}

export function TicketSetupCustomerAckSection({
  testId = "ticket-setup-ack-section",
  phoneTestId = "ticket-setup-phone-field",
  signTestId = "ticket-setup-sign-field",
}: TicketSetupCustomerAckSectionProps) {
  return (
    <div
      className="receipt-setup-ack-section receipt-setup-mono-body mt-1 space-y-2"
      data-testid={testId}
    >
      <TicketSetupDivider />
      <TicketSetupAckField
        label="Phone No"
        writingLines={THERMAL_ACK_PHONE_WRITING_LINES}
        testId={phoneTestId}
      />
      <TicketSetupAckField
        label="Sign"
        writingLines={THERMAL_ACK_SIGN_WRITING_LINES}
        testId={signTestId}
      />
    </div>
  )
}

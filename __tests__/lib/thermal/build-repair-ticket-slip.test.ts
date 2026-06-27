import {
  buildRepairTicketSlipBodyText,
  buildRepairTicketSlipInfoBlock,
  buildRepairTicketSlipText,
} from "@/lib/thermal/build-repair-ticket-slip"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

describe("buildRepairTicketSlipText", () => {
  const sampleInput = {
    ticketNo: "RT-SH001-202606-0001",
    branchName: "Shop One",
    issuedAt: "2026-06-04T12:00:00.000Z",
    fileNames: ["a.jpg", "b.jpg"],
  }

  it("renders receipt-family header, identity, body, footer, and ack", () => {
    const layout = resolveThermalLayout("REPAIR_TICKET", DEFAULT_THERMAL_LAYOUTS)
    const text = buildRepairTicketSlipText(sampleInput, layout, {
      branchCode: "SH001",
      staffId: "103",
      staffName: "Somsak",
    })
    expect(text).toContain("ASA SERVICES")
    expect(text).toContain("Repair Ticket")
    expect(text).toContain("ใบรับซ่อม")
    expect(text).toContain("Ref. RT-SH001-202606-0001")
    expect(text).toContain("Ticket No:")
    expect(text).toContain("RT-SH001-202606-0001")
    expect(text).toContain("Staff")
    expect(text).toContain("Somsak")
    expect(text).toContain("Photos (2)")
    expect(text).toContain("1. a.jpg")
    expect(text).toContain("คำเตือน:")
    expect(text).toContain("Phone No")
    expect(text).toContain("Sign")
    expect(text).not.toContain("Warning: bring this ticket")
    expect(text).not.toContain("within 30 days")
    expect(text).not.toContain("You may collect this ticket")
    for (const line of text.split("\n")) {
      if (!line.length) continue
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })
})

describe("buildRepairTicketSlipInfoBlock", () => {
  it("includes optional customer fields when present", () => {
    const rows = buildRepairTicketSlipInfoBlock({
      ticketNo: "RT-SH001-202606-0001",
      branchName: "Shop One",
      issuedAt: "2026-06-04T12:00:00.000Z",
      fileNames: [],
      customerName: "Somchai",
      customerPhone: "081-234-5678",
    })
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Customer:", value: "Somchai" }),
        expect.objectContaining({ label: "Phone:", value: "081-234-5678" }),
      ])
    )
  })
})

describe("buildRepairTicketSlipBodyText", () => {
  it("wraps description and lists photos compactly", () => {
    const text = buildRepairTicketSlipBodyText({
      ticketNo: "RT-SH001-202606-0001",
      branchName: "Shop One",
      issuedAt: "2026-06-04T12:00:00.000Z",
      fileNames: ["photo-1.jpg"],
      repairDescription: "Screen cracked — replace LCD",
    })
    expect(text).toContain("Screen cracked")
    expect(text).toContain("Photos (1)")
    expect(text).toContain("1. photo-1.jpg")
    expect(text).not.toContain("Shop One")
  })

  it("wraps long photo filenames across lines instead of clipping", () => {
    const fileName = "REP-SH001-202606-0007-01.jpg"
    const text = buildRepairTicketSlipBodyText({
      ticketNo: "RT-SH001-202606-0001",
      branchName: "Shop One",
      issuedAt: "2026-06-04T12:00:00.000Z",
      fileNames: [fileName],
    })
    const flattened = text.replace(/\s+/g, "")
    expect(flattened).toContain(fileName.replace(/\s+/g, ""))
    for (const line of text.split("\n")) {
      if (!line.length) continue
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })

  it("omits photo list when omitPhotoList is set", () => {
    const text = buildRepairTicketSlipBodyText(
      {
        ticketNo: "RT-SH001-202606-0001",
        branchName: "Shop One",
        issuedAt: "2026-06-04T12:00:00.000Z",
        fileNames: ["photo-1.jpg"],
      },
      { omitPhotoList: true }
    )
    expect(text).not.toContain("Photos (1)")
    expect(text).not.toContain("photo-1.jpg")
  })
})

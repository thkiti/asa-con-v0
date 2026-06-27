import {
  buildPosWorkspaceKeypadGhostButtonIds,
  isPosWorkspaceKeypadActionAllowed,
  resolvePosActiveWorkspace,
  shouldBlankNumericKeypadForWorkspace,
} from "@/lib/pos-ui/pos-workspace-keypad"

describe("pos-ui/pos-workspace-keypad", () => {
  it("resolves one active workspace at a time with lookup first", () => {
    expect(
      resolvePosActiveWorkspace({
        receiptLookupOpen: true,
        refundOpen: true,
      })
    ).toEqual({ kind: "lookup", activeButtonId: "receipt-lookup" })

    expect(
      resolvePosActiveWorkspace({
        refundOpen: true,
        readStaffGate: "X",
      })
    ).toEqual({ kind: "refund", activeButtonId: "refund" })

    expect(
      resolvePosActiveWorkspace({
        readStaffGate: "Z",
        collectorOpen: true,
      })
    ).toEqual({ kind: "read-z", activeButtonId: "read-z" })

    expect(
      resolvePosActiveWorkspace({
        readZLookupOpen: true,
        readReportMode: "Z",
      })
    ).toEqual({ kind: "read-z-lookup", activeButtonId: "read-z-lookup" })

    expect(
      resolvePosActiveWorkspace({
        readReportMode: "X",
        repairTicketOpen: true,
      })
    ).toEqual({ kind: "read-x", activeButtonId: "read-x" })

    expect(
      resolvePosActiveWorkspace({
        readReportMode: "COLLECT",
      })
    ).toEqual({ kind: "collector", activeButtonId: "collector" })

    expect(
      resolvePosActiveWorkspace({
        repairTicketOpen: true,
      })
    ).toEqual({ kind: "repair-ticket", activeButtonId: "repair-ticket" })
  })

  it("ghosts every keypad button except the active workspace opener", () => {
    const lookupGhost = buildPosWorkspaceKeypadGhostButtonIds({
      kind: "lookup",
      activeButtonId: "receipt-lookup",
    })
    expect(lookupGhost.has("receipt-lookup")).toBe(false)
    expect(lookupGhost.has("collector")).toBe(true)
    expect(lookupGhost.has("refund")).toBe(true)
    expect(lookupGhost.has("read-x")).toBe(true)
    expect(lookupGhost.has("checkout")).toBe(true)
    expect(lookupGhost.has("digit-1")).toBe(true)

    const readZGhost = buildPosWorkspaceKeypadGhostButtonIds({
      kind: "read-z",
      activeButtonId: "read-z",
    })
    expect(readZGhost.has("read-z")).toBe(false)
    expect(readZGhost.has("collector")).toBe(true)
    expect(readZGhost.has("print-report")).toBe(true)
    expect(readZGhost.has("refund")).toBe(true)
  })

  it("blanks numeric keypad for any active workspace", () => {
    expect(shouldBlankNumericKeypadForWorkspace(null)).toBe(false)
    expect(
      shouldBlankNumericKeypadForWorkspace({
        kind: "refund",
        activeButtonId: "refund",
      })
    ).toBe(true)
  })

  it("allows only active workspace actions", () => {
    const readZ = { kind: "read-z" as const, activeButtonId: "read-z" as const }
    expect(isPosWorkspaceKeypadActionAllowed(readZ, "read-z")).toBe(true)
    expect(isPosWorkspaceKeypadActionAllowed(readZ, "collector")).toBe(false)
    expect(isPosWorkspaceKeypadActionAllowed(readZ, "refund")).toBe(false)
    expect(isPosWorkspaceKeypadActionAllowed(readZ, "print-report")).toBe(false)
  })
})

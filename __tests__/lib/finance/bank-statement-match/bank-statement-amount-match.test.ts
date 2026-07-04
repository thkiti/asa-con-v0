import {
  formatGroupedMatchTooltip,
  journalLineIdForStatementLine,
  matchGroupForStatementLine,
  matchStatementLinesToJournal,
  statementLineIdForJournalLine,
} from "@/lib/finance/bank-statement-match"

describe("matchStatementLinesToJournal", () => {
  const journalLines = [
    { id: "j1", depositAmount: "100.00", withdrawalAmount: "0.00" },
    { id: "j2", depositAmount: "0.00", withdrawalAmount: "50.00" },
    { id: "j3", depositAmount: "100.00", withdrawalAmount: "0.00" },
  ]

  it("matches one statement row to one journal row", () => {
    const summary = matchStatementLinesToJournal(
      [
        { id: "s1", depositAmount: "100.00", withdrawalAmount: "" },
        { id: "s2", depositAmount: "", withdrawalAmount: "50.00" },
      ],
      journalLines
    )

    expect(summary.groups).toHaveLength(2)
    expect(summary.matches.length).toBeGreaterThanOrEqual(2)
    expect(journalLineIdForStatementLine(summary, "s1")).toBe("j1")
    expect(journalLineIdForStatementLine(summary, "s2")).toBe("j2")
    expect(statementLineIdForJournalLine(summary, "j1")).toBe("s1")
    expect(summary.unmatchedStatementLineIds).toEqual([])
    expect(summary.unmatchedJournalLineIds).toEqual(["j3"])
  })

  it("matches two statement rows that sum to one journal row", () => {
    const summary = matchStatementLinesToJournal(
      [
        { id: "s1", depositAmount: "", withdrawalAmount: "166250.00" },
        { id: "s2", depositAmount: "", withdrawalAmount: "20.00" },
      ],
      [{ id: "j-pav", depositAmount: "0.00", withdrawalAmount: "166270.00" }]
    )

    const group = matchGroupForStatementLine(summary, "s1")
    expect(group).not.toBeNull()
    expect(group?.statementLineIds.sort()).toEqual(["s1", "s2"])
    expect(group?.journalLineIds).toEqual(["j-pav"])
    expect(summary.matchedStatementLineIds.sort()).toEqual(["s1", "s2"])
    expect(summary.matchedJournalLineIds).toEqual(["j-pav"])
    expect(journalLineIdForStatementLine(summary, "s2")).toBe("j-pav")

    const tooltip = formatGroupedMatchTooltip(group!, { "j-pav": "PAV-260001" })
    expect(tooltip).toBe("Grouped match: 166,250.00 + 20.00 = PAV-260001 166,270.00")
  })

  it("matches one statement row to two journal rows that sum to the statement amount", () => {
    const summary = matchStatementLinesToJournal(
      [{ id: "s1", depositAmount: "166270.00", withdrawalAmount: "" }],
      [
        { id: "j1", depositAmount: "166250.00", withdrawalAmount: "0.00" },
        { id: "j2", depositAmount: "20.00", withdrawalAmount: "0.00" },
      ]
    )

    const group = matchGroupForStatementLine(summary, "s1")
    expect(group?.statementLineIds).toEqual(["s1"])
    expect(group?.journalLineIds.sort()).toEqual(["j1", "j2"])
    expect(summary.matchedJournalLineIds.sort()).toEqual(["j1", "j2"])
  })

  it("keeps grouped matching side-specific", () => {
    const summary = matchStatementLinesToJournal(
      [
        { id: "s-dep", depositAmount: "100.00", withdrawalAmount: "" },
        { id: "s-w1", depositAmount: "", withdrawalAmount: "60.00" },
        { id: "s-w2", depositAmount: "", withdrawalAmount: "40.00" },
      ],
      [
        { id: "j-dep", depositAmount: "100.00", withdrawalAmount: "0.00" },
        { id: "j-w", depositAmount: "0.00", withdrawalAmount: "100.00" },
      ]
    )

    expect(journalLineIdForStatementLine(summary, "s-dep")).toBe("j-dep")
    expect(journalLineIdForStatementLine(summary, "s-w1")).toBe("j-w")
    expect(journalLineIdForStatementLine(summary, "s-w2")).toBe("j-w")
    expect(summary.groups.every((group) => group.matchKind === "deposit" || group.matchKind === "withdrawal")).toBe(true)
  })

  it("does not match deposit statement rows to withdrawal journal rows", () => {
    const summary = matchStatementLinesToJournal(
      [{ id: "s1", depositAmount: "100.00", withdrawalAmount: "" }],
      [{ id: "j1", depositAmount: "0.00", withdrawalAmount: "100.00" }]
    )

    expect(summary.matchedStatementLineIds).toEqual([])
    expect(summary.unmatchedStatementLineIds).toEqual(["s1"])
  })

  it("leaves unmatched statement amounts for investigation", () => {
    const summary = matchStatementLinesToJournal(
      [{ id: "s1", depositAmount: "999.00", withdrawalAmount: "" }],
      journalLines
    )

    expect(summary.groups).toHaveLength(0)
    expect(summary.unmatchedStatementLineIds).toEqual(["s1"])
    expect(summary.unmatchedJournalLineIds).toEqual(["j1", "j2", "j3"])
  })

  it("ignores statement rows without amounts", () => {
    const summary = matchStatementLinesToJournal(
      [{ id: "s-empty", depositAmount: "", withdrawalAmount: "" }],
      journalLines
    )

    expect(summary.groups).toHaveLength(0)
    expect(summary.unmatchedStatementLineIds).toEqual([])
  })

  it("prefers one-to-one matches before grouped matches", () => {
    const summary = matchStatementLinesToJournal(
      [
        { id: "s-exact", depositAmount: "100.00", withdrawalAmount: "" },
        { id: "s-a", depositAmount: "60.00", withdrawalAmount: "" },
        { id: "s-b", depositAmount: "40.00", withdrawalAmount: "" },
      ],
      [
        { id: "j-exact", depositAmount: "100.00", withdrawalAmount: "0.00" },
        { id: "j-sum", depositAmount: "100.00", withdrawalAmount: "0.00" },
      ]
    )

    expect(journalLineIdForStatementLine(summary, "s-exact")).toBe("j-exact")
    expect(summary.matchedJournalLineIds.sort()).toEqual(["j-exact", "j-sum"])
  })
})

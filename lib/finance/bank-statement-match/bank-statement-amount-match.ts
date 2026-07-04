export type AmountMatchLine = {
  id: string
  depositAmount: string
  withdrawalAmount: string
}

export type AmountMatchLink = {
  statementLineId: string
  journalLineId: string
  matchKind: "deposit" | "withdrawal"
  matchedAmount: string
  groupId?: string
}

export type AmountMatchGroup = {
  groupId: string
  matchKind: "deposit" | "withdrawal"
  statementLineIds: string[]
  journalLineIds: string[]
  statementAmounts: string[]
  journalAmounts: string[]
  totalAmount: string
}

export type AmountMatchSummary = {
  matches: AmountMatchLink[]
  groups: AmountMatchGroup[]
  matchedStatementLineIds: string[]
  matchedJournalLineIds: string[]
  unmatchedStatementLineIds: string[]
  unmatchedJournalLineIds: string[]
}

const MAX_GROUP_SIZE = 8

function parseAmount(value: string | null | undefined): number {
  if (value == null) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const parsed = Number.parseFloat(trimmed.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}

function formatAmount(value: number): string {
  return value.toFixed(2)
}

function formatDisplayAmount(value: string | number): string {
  const num = typeof value === "number" ? value : parseAmount(value)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statementLineHasAmount(line: AmountMatchLine): boolean {
  return parseAmount(line.depositAmount) > 0 || parseAmount(line.withdrawalAmount) > 0
}

type MatchSide = "deposit" | "withdrawal"

function statementSide(line: AmountMatchLine): MatchSide | null {
  const deposit = parseAmount(line.depositAmount)
  const withdrawal = parseAmount(line.withdrawalAmount)
  if (deposit > 0 && withdrawal <= 0) return "deposit"
  if (withdrawal > 0 && deposit <= 0) return "withdrawal"
  return null
}

function sideAmount(line: AmountMatchLine, side: MatchSide): number {
  return side === "deposit" ? parseAmount(line.depositAmount) : parseAmount(line.withdrawalAmount)
}

function journalSide(line: AmountMatchLine): MatchSide | null {
  const deposit = parseAmount(line.depositAmount)
  const withdrawal = parseAmount(line.withdrawalAmount)
  if (deposit > 0 && withdrawal <= 0) return "deposit"
  if (withdrawal > 0 && deposit <= 0) return "withdrawal"
  return null
}

type MatchCandidate = { id: string; amount: number }

function findFirstSubsetSum(
  items: MatchCandidate[],
  target: number,
  minSize: number,
  maxSize: number
): string[] | null {
  let found: string[] | null = null

  function dfs(index: number, picked: string[], sum: number) {
    if (found) return
    if (picked.length >= minSize && amountsEqual(sum, target)) {
      found = picked
      return
    }
    if (picked.length >= maxSize || index >= items.length) return

    const item = items[index]
    dfs(index + 1, [...picked, item.id], sum + item.amount)
    if (found) return
    dfs(index + 1, picked, sum)
  }

  dfs(0, [], 0)
  return found
}

function createGroup(input: {
  matchKind: MatchSide
  statementLines: AmountMatchLine[]
  journalLines: AmountMatchLine[]
}): AmountMatchGroup {
  const statementAmounts = input.statementLines.map((line) =>
    formatAmount(sideAmount(line, input.matchKind))
  )
  const journalAmounts = input.journalLines.map((line) =>
    formatAmount(sideAmount(line, input.matchKind))
  )
  const total = sideAmount(input.statementLines[0], input.matchKind)
  const statementTotal = input.statementLines.reduce(
    (sum, line) => sum + sideAmount(line, input.matchKind),
    0
  )

  return {
    groupId: `g-${input.statementLines.map((line) => line.id).join("-")}-${input.journalLines.map((line) => line.id).join("-")}`,
    matchKind: input.matchKind,
    statementLineIds: input.statementLines.map((line) => line.id),
    journalLineIds: input.journalLines.map((line) => line.id),
    statementAmounts,
    journalAmounts,
    totalAmount: formatAmount(statementTotal || total),
  }
}

function addGroup(
  group: AmountMatchGroup,
  matches: AmountMatchLink[],
  groups: AmountMatchGroup[],
  matchedStatementIds: Set<string>,
  matchedJournalIds: Set<string>
) {
  groups.push(group)
  for (const statementLineId of group.statementLineIds) {
    matchedStatementIds.add(statementLineId)
    for (const journalLineId of group.journalLineIds) {
      matches.push({
        statementLineId,
        journalLineId,
        matchKind: group.matchKind,
        matchedAmount: group.totalAmount,
        groupId: group.groupId,
      })
    }
  }
  for (const journalLineId of group.journalLineIds) {
    matchedJournalIds.add(journalLineId)
  }
}

function matchOneToOne(
  statementLines: AmountMatchLine[],
  journalLines: AmountMatchLine[],
  matchedStatementIds: Set<string>,
  matchedJournalIds: Set<string>,
  matches: AmountMatchLink[],
  groups: AmountMatchGroup[]
) {
  for (const statementLine of statementLines) {
    if (!statementLineHasAmount(statementLine) || matchedStatementIds.has(statementLine.id)) continue

    const side = statementSide(statementLine)
    if (!side) continue

    const amount = sideAmount(statementLine, side)
    const journalMatch = journalLines.find(
      (journalLine) =>
        !matchedJournalIds.has(journalLine.id) &&
        journalSide(journalLine) === side &&
        amountsEqual(sideAmount(journalLine, side), amount)
    )

    if (!journalMatch) continue

    const group = createGroup({
      matchKind: side,
      statementLines: [statementLine],
      journalLines: [journalMatch],
    })
    addGroup(group, matches, groups, matchedStatementIds, matchedJournalIds)
  }
}

function matchManyStatementsToOneJournal(
  statementLines: AmountMatchLine[],
  journalLines: AmountMatchLine[],
  matchedStatementIds: Set<string>,
  matchedJournalIds: Set<string>,
  matches: AmountMatchLink[],
  groups: AmountMatchGroup[]
) {
  for (const journalLine of journalLines) {
    if (matchedJournalIds.has(journalLine.id)) continue

    const side = journalSide(journalLine)
    if (!side) continue

    const target = sideAmount(journalLine, side)
    const candidates = statementLines
      .filter(
        (line) =>
          !matchedStatementIds.has(line.id) &&
          statementSide(line) === side
      )
      .map((line) => ({ id: line.id, amount: sideAmount(line, side) }))

    const subsetIds = findFirstSubsetSum(candidates, target, 2, MAX_GROUP_SIZE)
    if (!subsetIds) continue

    const statementSubset = subsetIds
      .map((id) => statementLines.find((line) => line.id === id))
      .filter((line): line is AmountMatchLine => line != null)

    const group = createGroup({
      matchKind: side,
      statementLines: statementSubset,
      journalLines: [journalLine],
    })
    addGroup(group, matches, groups, matchedStatementIds, matchedJournalIds)
  }
}

function matchOneStatementToManyJournal(
  statementLines: AmountMatchLine[],
  journalLines: AmountMatchLine[],
  matchedStatementIds: Set<string>,
  matchedJournalIds: Set<string>,
  matches: AmountMatchLink[],
  groups: AmountMatchGroup[]
) {
  for (const statementLine of statementLines) {
    if (!statementLineHasAmount(statementLine) || matchedStatementIds.has(statementLine.id)) continue

    const side = statementSide(statementLine)
    if (!side) continue

    const target = sideAmount(statementLine, side)
    const candidates = journalLines
      .filter(
        (line) =>
          !matchedJournalIds.has(line.id) &&
          journalSide(line) === side
      )
      .map((line) => ({ id: line.id, amount: sideAmount(line, side) }))

    const subsetIds = findFirstSubsetSum(candidates, target, 2, MAX_GROUP_SIZE)
    if (!subsetIds) continue

    const journalSubset = subsetIds
      .map((id) => journalLines.find((line) => line.id === id))
      .filter((line): line is AmountMatchLine => line != null)

    const group = createGroup({
      matchKind: side,
      statementLines: [statementLine],
      journalLines: journalSubset,
    })
    addGroup(group, matches, groups, matchedStatementIds, matchedJournalIds)
  }
}

/**
 * Amount matching: 1:1 first, then grouped many-to-one and one-to-many on the same side.
 */
export function matchStatementLinesToJournal(
  statementLines: AmountMatchLine[],
  journalLines: AmountMatchLine[]
): AmountMatchSummary {
  const matchedJournalIds = new Set<string>()
  const matchedStatementIds = new Set<string>()
  const matches: AmountMatchLink[] = []
  const groups: AmountMatchGroup[] = []

  matchOneToOne(statementLines, journalLines, matchedStatementIds, matchedJournalIds, matches, groups)
  matchManyStatementsToOneJournal(
    statementLines,
    journalLines,
    matchedStatementIds,
    matchedJournalIds,
    matches,
    groups
  )
  matchOneStatementToManyJournal(
    statementLines,
    journalLines,
    matchedStatementIds,
    matchedJournalIds,
    matches,
    groups
  )

  const unmatchedStatementLineIds = statementLines
    .filter((line) => statementLineHasAmount(line) && !matchedStatementIds.has(line.id))
    .map((line) => line.id)

  const unmatchedJournalLineIds = journalLines
    .filter((line) => {
      const hasAmount =
        parseAmount(line.depositAmount) > 0 || parseAmount(line.withdrawalAmount) > 0
      return hasAmount && !matchedJournalIds.has(line.id)
    })
    .map((line) => line.id)

  return {
    matches,
    groups,
    matchedStatementLineIds: [...matchedStatementIds],
    matchedJournalLineIds: [...matchedJournalIds],
    unmatchedStatementLineIds,
    unmatchedJournalLineIds,
  }
}

export function matchGroupForStatementLine(
  summary: AmountMatchSummary,
  statementLineId: string
): AmountMatchGroup | null {
  return summary.groups.find((group) => group.statementLineIds.includes(statementLineId)) ?? null
}

export function matchGroupForJournalLine(
  summary: AmountMatchSummary,
  journalLineId: string
): AmountMatchGroup | null {
  return summary.groups.find((group) => group.journalLineIds.includes(journalLineId)) ?? null
}

export function journalLineIdForStatementLine(
  summary: AmountMatchSummary,
  statementLineId: string
): string | null {
  const group = matchGroupForStatementLine(summary, statementLineId)
  if (group) return group.journalLineIds[0] ?? null
  return summary.matches.find((match) => match.statementLineId === statementLineId)?.journalLineId ?? null
}

export function statementLineIdForJournalLine(
  summary: AmountMatchSummary,
  journalLineId: string
): string | null {
  const group = matchGroupForJournalLine(summary, journalLineId)
  if (group) return group.statementLineIds[0] ?? null
  return summary.matches.find((match) => match.journalLineId === journalLineId)?.statementLineId ?? null
}

export function formatGroupedMatchTooltip(
  group: AmountMatchGroup,
  journalLabels: Record<string, string>
): string {
  const statementPart = group.statementAmounts.map(formatDisplayAmount).join(" + ")

  if (group.statementLineIds.length > 1 && group.journalLineIds.length === 1) {
    const journalLineId = group.journalLineIds[0]
    const label = journalLabels[journalLineId] ?? journalLineId
    const journalAmount = formatDisplayAmount(group.journalAmounts[0] ?? group.totalAmount)
    return `Grouped match: ${statementPart} = ${label} ${journalAmount}`
  }

  if (group.statementLineIds.length === 1 && group.journalLineIds.length > 1) {
    const journalPart = group.journalLineIds
      .map((journalLineId, index) => {
        const label = journalLabels[journalLineId] ?? journalLineId
        const amount = formatDisplayAmount(group.journalAmounts[index] ?? "0")
        return `${label} ${amount}`
      })
      .join(" + ")
    return `Grouped match: ${statementPart} = ${journalPart}`
  }

  if (group.statementLineIds.length > 1 || group.journalLineIds.length > 1) {
    const journalPart = group.journalLineIds
      .map((journalLineId, index) => {
        const label = journalLabels[journalLineId] ?? journalLineId
        const amount = formatDisplayAmount(group.journalAmounts[index] ?? "0")
        return `${label} ${amount}`
      })
      .join(" + ")
    return `Grouped match: ${statementPart} = ${journalPart}`
  }

  const journalLineId = group.journalLineIds[0]
  const label = journalLineId ? (journalLabels[journalLineId] ?? journalLineId) : "journal"
  const journalAmount = formatDisplayAmount(group.journalAmounts[0] ?? group.totalAmount)
  return `Matched: ${statementPart} = ${label} ${journalAmount}`
}

export function isGroupedMatch(group: AmountMatchGroup): boolean {
  return group.statementLineIds.length > 1 || group.journalLineIds.length > 1
}

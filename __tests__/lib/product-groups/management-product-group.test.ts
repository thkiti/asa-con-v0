import {
  EXPLICIT_SUMMARY_HEADERS,
  mergeManagementGroupSummary,
  normalizeToSummaryHeader,
  POLICY_SUMMARY_HEADERS,
  resolveConfiguredProductGroup,
  resolveToSummaryHeader,
} from "@/lib/product-groups/management-product-group"

describe("normalizeToSummaryHeader", () => {
  it("rolls key variant groups to GG00900", () => {
    expect(normalizeToSummaryHeader("0101901")).toBe("0100900")
    expect(normalizeToSummaryHeader("0102901")).toBe("0100900")
    expect(normalizeToSummaryHeader("1101901")).toBe("1100900")
  })

  it.each(EXPLICIT_SUMMARY_HEADERS)(
    "preserves explicit summary header %s",
    (code) => {
      expect(normalizeToSummaryHeader(code)).toBe(code)
    }
  )

  it("maps GG=70 service lines to GGTT900", () => {
    expect(normalizeToSummaryHeader("7001001")).toBe("7001900")
    expect(normalizeToSummaryHeader("7002001")).toBe("7002900")
  })

  it("returns null for invalid codes", () => {
    expect(normalizeToSummaryHeader(null)).toBeNull()
    expect(normalizeToSummaryHeader("")).toBeNull()
    expect(normalizeToSummaryHeader("123")).toBeNull()
  })
})

describe("resolveConfiguredProductGroup", () => {
  const refMap = new Map([
    [
      "p-home-small",
      [{ productGroup: "0101901" }],
    ],
    [
      "p-no-group",
      [{ productGroup: null }],
    ],
  ])

  it("returns stored ReferenceStock.productGroup", () => {
    expect(resolveConfiguredProductGroup("p-home-small", refMap)).toBe("0101901")
  })

  it("returns null when ReferenceStock is missing", () => {
    expect(resolveConfiguredProductGroup("p-missing", refMap)).toBeNull()
  })

  it("returns null when productGroup is empty", () => {
    expect(resolveConfiguredProductGroup("p-no-group", refMap)).toBeNull()
  })
})

describe("resolveToSummaryHeader", () => {
  it("combines configured group with normalized summary", () => {
    const refMap = new Map([["p1", [{ productGroup: "0102901" }]]])
    expect(resolveToSummaryHeader("p1", refMap)).toEqual({
      configured: "0102901",
      summaryHeader: "0100900",
    })
  })

  it("returns null when unresolved", () => {
    expect(resolveToSummaryHeader("missing", new Map())).toBeNull()
  })
})

describe("loadSummaryHeaderLabels", () => {
  it("marks missing header Product as missing label status", async () => {
    const { loadSummaryHeaderLabels } = await import(
      "@/lib/product-groups/management-product-group"
    )
    const db = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          { code: "5100900", name: "Ladies' Heels" },
        ]),
      },
    }

    const labels = await loadSummaryHeaderLabels(db, ["5100900", "5500900"])

    expect(labels.get("5100900")).toEqual({
      headerCode: "5100900",
      name: "Ladies' Heels",
      labelStatus: "ok",
    })
    expect(labels.get("5500900")).toEqual({
      headerCode: "5500900",
      name: null,
      labelStatus: "missing",
    })
  })
})

describe("mergeManagementGroupSummary", () => {
  const labels = new Map([
    [
      "0100900",
      { headerCode: "0100900", name: "Home Key", labelStatus: "ok" as const },
    ],
    [
      "5100900",
      {
        headerCode: "5100900",
        name: null,
        labelStatus: "missing" as const,
      },
    ],
  ])

  it("zero-fill includes all policy headers", () => {
    const rows = mergeManagementGroupSummary({
      catalog: POLICY_SUMMARY_HEADERS,
      labels: new Map(),
      aggregates: new Map(),
      includeZeroRows: true,
    })

    expect(rows).toHaveLength(POLICY_SUMMARY_HEADERS.length)
    expect(rows.map((r) => r.headerCode)).toEqual([...POLICY_SUMMARY_HEADERS])
    for (const row of rows) {
      expect(row.qty).toBe(0)
      expect(row.amount).toBe(0)
      expect(row.items).toBe(0)
      expect(row.labelStatus).toBe("missing")
    }
  })

  it("sales-only omits zero rows", () => {
    const aggregates = new Map([
      ["0100900", { qty: 5, amount: 100 }],
    ])
    const rows = mergeManagementGroupSummary({
      catalog: POLICY_SUMMARY_HEADERS,
      labels,
      aggregates,
      includeZeroRows: false,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      headerCode: "0100900",
      qty: 5,
      amount: 100,
      label: "Home Key",
      labelStatus: "ok",
    })
  })

  it("applies label metadata to merged rows", () => {
    const rows = mergeManagementGroupSummary({
      catalog: ["0100900", "5100900"],
      labels,
      aggregates: new Map([["5100900", { qty: 2 }]]),
      includeZeroRows: true,
    })

    expect(rows.find((r) => r.headerCode === "5100900")).toMatchObject({
      label: null,
      labelStatus: "missing",
      qty: 2,
    })
  })
})

describe("loadCompanySummaryCatalog", () => {
  it("includes policy headers and normalized ref groups", async () => {
    const { loadCompanySummaryCatalog } = await import(
      "@/lib/product-groups/management-product-group"
    )
    const db = {
      referenceStock: {
        findMany: jest.fn().mockResolvedValue([
          { productGroup: "0101901" },
          { productGroup: "5100900" },
        ]),
      },
    }

    const catalog = await loadCompanySummaryCatalog(db)

    expect(catalog).toContain("0100900")
    expect(catalog).toContain("5100900")
    for (const header of POLICY_SUMMARY_HEADERS) {
      expect(catalog).toContain(header)
    }
  })
})

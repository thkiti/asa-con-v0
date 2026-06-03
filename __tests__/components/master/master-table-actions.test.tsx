/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MasterRowActions } from "@/components/master/shared/MasterRowActions"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { MASTER_ACTIONS_COLUMN } from "@/lib/master-ui/table-columns"

const BRANCH_COLUMNS = [
  { key: "code", label: "Code", width: "88px" },
  MASTER_ACTIONS_COLUMN,
] as const

const STAFF_COLUMNS = [
  { key: "staffId", label: "Staff ID", width: "88px" },
  MASTER_ACTIONS_COLUMN,
] as const

const PRODUCT_REF_COLUMNS = [
  { key: "code", label: "Product code", width: "110px" },
  MASTER_ACTIONS_COLUMN,
] as const

describe("MasterTable sticky header", () => {
  it.each([
    ["product-reference", PRODUCT_REF_COLUMNS],
    ["branch", BRANCH_COLUMNS],
    ["staff", STAFF_COLUMNS],
  ] as const)("applies sticky scroll for %s", (_label, columns) => {
    const html = renderToStaticMarkup(
      <MasterTable columns={columns}>
        <tbody />
      </MasterTable>
    )
    expect(html).toContain('data-sticky-scroll="true"')
    expect(html).toContain("sticky")
    expect(html).toContain("top-0")
    expect(html).toContain("bg-card")
  })
})

describe("Branch table actions column", () => {
  it("renders enabled edit/delete when handlers provided", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={BRANCH_COLUMNS}>
        <MasterTableRow
          cells={["SH010"]}
          actions={
            <MasterRowActions
              editTitle="Edit branch"
              deleteTitle="Delete branch"
              editDisabled={false}
              deleteDisabled={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          }
        />
      </MasterTable>
    )
    expect(html).toContain("Edit branch")
    expect(html).not.toContain('disabled=""')
  })
})

describe("Staff table actions column", () => {
  it("renders disabled edit/delete with staff labels", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={STAFF_COLUMNS}>
        <MasterTableRow
          cells={["001"]}
          actions={
            <MasterRowActions
              editTitle="Edit planned"
              deleteTitle="Delete planned"
              editAriaLabel="Edit staff planned"
              deleteAriaLabel="Delete staff planned"
            />
          }
        />
      </MasterTable>
    )
    expect(html).toContain("Edit staff planned")
    expect(html).toContain("Delete staff planned")
  })
})

describe("Product-Reference table actions column", () => {
  it("renders reference link actions when hasReference", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={PRODUCT_REF_COLUMNS}>
        <MasterTableRow
          cells={["5101001"]}
          actions={
            <MasterRowActions
              editTitle="Edit planned"
              deleteTitle="Delete planned"
              editAriaLabel="Edit reference link planned"
              deleteAriaLabel="Delete reference link planned"
            />
          }
        />
      </MasterTable>
    )
    expect(html).toContain("Edit reference link planned")
    expect(html).toContain("Delete reference link planned")
  })

  it("explains no reference on delete when hasReference is false", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={PRODUCT_REF_COLUMNS}>
        <MasterTableRow
          cells={["6101001"]}
          actions={
            <MasterRowActions
              editTitle="Add/Edit link planned"
              deleteTitle="No reference to delete"
              editAriaLabel="Add or edit reference link planned"
              deleteAriaLabel="No reference to delete"
            />
          }
        />
      </MasterTable>
    )
    expect(html).toContain("Add or edit reference link planned")
    expect(html).toContain("No reference to delete")
  })
})

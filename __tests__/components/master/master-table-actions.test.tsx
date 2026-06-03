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

describe("MasterTable sticky scroll", () => {
  it("sets data-sticky-scroll for Product-Reference layout", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={PRODUCT_REF_COLUMNS} stickyScroll>
        <tbody />
      </MasterTable>
    )
    expect(html).toContain('data-sticky-scroll="true"')
    expect(html).toContain("sticky")
    expect(html).toContain("top-0")
  })

  it("does not set sticky scroll on default Branch table", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={BRANCH_COLUMNS}>
        <tbody />
      </MasterTable>
    )
    expect(html).not.toContain('data-sticky-scroll="true"')
  })
})

describe("Branch table actions column", () => {
  it("renders disabled edit/delete with branch labels", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={BRANCH_COLUMNS}>
        <MasterTableRow
          cells={["HO999"]}
          actions={
            <MasterRowActions
              editTitle="Edit planned"
              deleteTitle="Delete planned"
              editAriaLabel="Edit branch planned"
              deleteAriaLabel="Delete branch planned"
            />
          }
        />
      </MasterTable>
    )
    expect(html).toContain("Edit branch planned")
    expect(html).toContain("Delete branch planned")
    expect(html).toContain('disabled=""')
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
      <MasterTable columns={PRODUCT_REF_COLUMNS} stickyScroll>
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
      <MasterTable columns={PRODUCT_REF_COLUMNS} stickyScroll>
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

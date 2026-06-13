import Link from "next/link"

import { StockDocumentEditorController } from "@/components/stock/StockDocumentEditorController"

import { formatEntityContextTitle } from "@/lib/legal-entity"

import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

import { isShopDocType } from "@/lib/stock-ui/editor-draft-state"

import { formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"

import { isStockCountStaffEntry } from "@/lib/stock-ui/stock-count-staff-mode"

import type { DocType } from "@/lib/stock-ui/types"



type PageProps = {

  searchParams: Promise<{ type?: string; from?: string }>

}



export default async function NewStockDocumentPage({ searchParams }: PageProps) {

  const { type, from } = await searchParams

  const rawType = String(type ?? "").trim().toUpperCase()

  const docType = isShopDocType(rawType) ? (rawType as DocType) : null

  const stockCountStaffMode = isStockCountStaffEntry(from)



  if (!docType) {

    return (

      <main className="p-8">

        <Link

          href="/shop/stock-documents"

          className="text-sm text-zinc-600 hover:text-zinc-900"

        >

          ← Stock documents

        </Link>

        <h1

          className="mt-4 text-xl font-semibold"

          data-testid="entity-context-page-title"

        >

          {formatEntityContextTitle("AS", "New Document")}

        </h1>

        <p className="mt-2 text-red-700">

          Missing or invalid type. Use TRANSFER_OUT, PERFORMANCE, or ADJUSTMENT.

        </p>

      </main>

    )

  }



  const pageTitle = formatStaffFacingDocumentTitle(

    docType,

    "DRAFT",

    DEFAULT_DOCUMENT_ENTITY_CODE

  )



  return (

    <main

      className={

        stockCountStaffMode

          ? "flex h-dvh flex-col overflow-hidden p-2"

          : "p-8"

      }

    >

      {!stockCountStaffMode ? (

        <>

          <Link

            href="/shop/stock-documents"

            className="text-sm text-zinc-600 hover:text-zinc-900"

          >

            ← Stock documents

          </Link>

          <h1

            className="mt-4 text-xl font-semibold"

            data-testid="entity-context-page-title"

          >

            {pageTitle}

          </h1>

        </>

      ) : null}

      <div

        className={

          stockCountStaffMode ? "flex min-h-0 flex-1 flex-col" : "mt-6"

        }

      >

        <StockDocumentEditorController

          mode="create"

          docType={docType}

          stockCountStaffMode={stockCountStaffMode}

        />

      </div>

    </main>

  )

}


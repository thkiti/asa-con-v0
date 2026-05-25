# Phase 1 Review Package

**Project:** `asa-con-v0`  
**Phase:** 1 — Prisma kernel + shared infrastructure  
**Date:** 2026-05-21  
**Reference repo:** `asa-con` (read-only, no code copied)

---

## Scope delivered

| In scope | Status |
|----------|--------|
| `prisma/schema.prisma` (10 models, 5 enums) | Done |
| `lib/shared/prisma.ts` | Done |
| `lib/shared/types.ts` | Done |
| `prisma generate` | Done |
| `npm run build` | Pass |
| Real database migration | **Not executed** |

| Out of scope (confirmed absent) | |
|---------------------------------|---|
| `issueStock`, posting, workflow, validation | Not added |
| Finance / POS / Sale / GL models | Not in schema |
| New API routes | Not added |
| `prisma/migrations/` | Does not exist |

---

## 1. `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  HO_FINANCE
  HO_ADMIN
  HO_OPERATIONS
  SH_STAFF
}

enum BranchType {
  HO
  SH
}

enum ProductType {
  TRACKED
  CONSUMABLE
}

enum DocType {
  PURCHASE
  TRANSFER_OUT
  TRANSFER_IN
  ADJUSTMENT
  PERFORMANCE
}

enum DocStatus {
  DRAFT
  SUBMITTED
  SHIPPED
  CONFIRMED
  RECEIVED
  POSTED
  TRANSFERRED
}

model Branch {
  id        String     @id @default(uuid())
  code      String     @unique
  name      String
  type      BranchType @default(SH)
  isActive  Boolean    @default(true)
  deleted   Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  staffs            Staff[]
  stocks            Stock[]
  stockLayers       StockLayer[]
  stockTransactions StockTransaction[]
}

model Staff {
  id        String   @id @default(cuid())
  staffId   String   @unique
  password  String
  name      String
  role      Role
  branchId  String
  deleted   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  branch Branch @relation(fields: [branchId], references: [id])
}

model Product {
  id          String      @id @default(uuid())
  groupCode   Int
  typeCode    Int
  runningCode Int
  code        String      @unique
  name        String
  productType ProductType @default(TRACKED)
  deleted     Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  referenceStock     ReferenceStock?
  stocks             Stock[]
  stockLayers        StockLayer[]
  stockTransactions  StockTransaction[]
  stockDocumentLines StockDocumentLine[]

  @@unique([groupCode, typeCode, runningCode])
}

model ReferenceStock {
  id           String   @id @default(uuid())
  hookGroup    String
  hookNo       Int
  supplierCode String
  productCode  String
  productGroup String?
  productId    String   @unique
  deleted      Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])
}

model Stock {
  id        String   @id @default(uuid())
  branchId  String
  productId String
  qty       Int      @default(0)
  avgCost   Decimal  @default(0) @db.Decimal(18, 6)
  updatedAt DateTime @updatedAt

  branch  Branch  @relation(fields: [branchId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([branchId, productId])
}

model StockLayer {
  id        String   @id @default(uuid())
  branchId  String
  productId String
  qty       Int
  qtyRemain Int
  unitCost  Decimal  @db.Decimal(18, 6)
  refType   String?
  refId     String?
  createdAt DateTime @default(now())

  branch  Branch  @relation(fields: [branchId], references: [id])
  product Product @relation(fields: [productId], references: [id])
}

model StockTransaction {
  id          String   @id @default(uuid())
  branchId    String
  productId   String
  date        DateTime
  qtyIn       Int      @default(0)
  qtyOut      Int      @default(0)
  unitCost    Decimal  @db.Decimal(18, 6)
  beforeQty   Int
  afterQty    Int
  beforeValue Decimal  @db.Decimal(18, 6)
  afterValue  Decimal  @db.Decimal(18, 6)
  refType     String
  refId       String
  refLineId   String
  documentId  String?
  createdAt   DateTime @default(now())

  branch   Branch         @relation(fields: [branchId], references: [id])
  product  Product        @relation(fields: [productId], references: [id])
  document StockDocument? @relation(fields: [documentId], references: [id])
}

model StockDocument {
  id                 String    @id @default(uuid())
  refNo              String    @unique
  docType            DocType
  status             DocStatus @default(DRAFT)
  date               DateTime
  periodMonth        String?
  fromLocId          String?
  toLocId            String?
  submittedAt        DateTime?
  confirmedAt        DateTime?
  postedAt           DateTime?
  createdByStaffId   String?
  confirmedByStaffId String?
  postedByStaffId    String?
  createdAt          DateTime  @default(now())

  lines        StockDocumentLine[]
  transactions StockTransaction[]
}

model StockDocumentLine {
  id                 String @id @default(uuid())
  documentId         String
  productId          String
  qty                Int
  endingQty          Int?
  reviewPostingDelta Int?

  document StockDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  product  Product       @relation(fields: [productId], references: [id])
}

model DocumentCounter {
  id      String @id @default(uuid())
  docType String
  shopId  String
  period  String
  running Int    @default(0)

  @@unique([docType, shopId, period])
}
```

---

## 2. Enums summary

| Enum | Values | Used by |
|------|--------|---------|
| `Role` | `HO_FINANCE`, `HO_ADMIN`, `HO_OPERATIONS`, `SH_STAFF` | `Staff.role` |
| `BranchType` | `HO`, `SH` | `Branch.type` |
| `ProductType` | `TRACKED`, `CONSUMABLE` | `Product.productType` |
| `DocType` | `PURCHASE`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT`, `PERFORMANCE` | `StockDocument.docType` |
| `DocStatus` | `DRAFT`, `SUBMITTED`, `SHIPPED`, `CONFIRMED`, `RECEIVED`, `POSTED`, `TRANSFERRED` | `StockDocument.status` |

**Models (10):** `Branch`, `Staff`, `Product`, `ReferenceStock`, `Stock`, `StockLayer`, `StockTransaction`, `StockDocument`, `StockDocumentLine`, `DocumentCounter`

**Not included:** Finance, GL, Sale, Receipt, Session, Pricing, MonthControl, risk/tax snapshots.

---

## 3. `lib/shared/prisma.ts`

```typescript
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```

**Notes:**

- Singleton pattern for dev hot-reload
- Requires `DATABASE_URL` at **runtime** when imported
- Not imported by any `app/` route yet (build does not connect to DB)

---

## 4. `lib/shared/types.ts`

```typescript
/**
 * Kernel enums — re-exported from Prisma client.
 * Do not duplicate these as manual string unions.
 */
export {
  Role,
  BranchType,
  ProductType,
  DocType,
  DocStatus,
} from "@/generated/prisma/client"

/** Accounting period key (YYYYMM). */
export type PeriodMonth = string

/** Classifier stored on StockTransaction.refType / StockLayer.refType. */
export type StockRefType = string
```

**Public barrel (`lib/shared/index.ts`):**

```typescript
export { prisma } from "./prisma"
export type { PeriodMonth, StockRefType } from "./types"
export {
  Role,
  BranchType,
  ProductType,
  DocType,
  DocStatus,
} from "./types"
```

---

## 5. Folder tree

### `prisma/`

```
prisma/
├── README.md
└── schema.prisma
```

No `prisma/migrations/` directory. No `seed.ts`.

### `lib/shared/`

```
lib/shared/
├── README.md
├── index.ts
├── prisma.ts
└── types.ts
```

### Generated (gitignored)

```
generated/prisma/     ← output of `prisma generate`
```

---

## 6. `npm run build` output summary

**Command:** `npm run build` → `prisma generate && next build`  
**Result:** Exit code **0** (pass)

```
✔ Generated Prisma Client (7.8.0) to .\generated\prisma

▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully
  Finished TypeScript ...
✓ Generating static pages (10/10)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin
├ ƒ /api/health
├ ○ /finance
├ ○ /login
├ ○ /operations
└ ○ /shop

ƒ Proxy (Middleware)
```

**Warning (non-blocking):** Next.js 16 deprecates `middleware.ts` in favor of `proxy` — deferred to Phase 2.

---

## 7. Migration confirmation

| Check | Result |
|-------|--------|
| `prisma migrate dev` executed | **No** |
| `prisma migrate deploy` executed | **No** |
| `prisma/migrations/` exists | **No** (`Test-Path` → `False`) |
| Existing databases modified | **No** |
| `prisma generate` only | **Yes** — client written to `generated/prisma/` |
| `DATABASE_URL` required for generate | **No** — placeholder in `prisma.config.ts` when unset |

Migrations remain a **separate, reviewed step** before any database is touched.

---

## Review checklist

- [ ] Kernel models sufficient for first stock-document slice
- [ ] `DocStatus` enum covers full workflow (incl. `SHIPPED`, `RECEIVED`, `TRANSFERRED`)
- [ ] No finance/POS models leaked into schema
- [ ] Shared types avoid duplicating Prisma model types
- [ ] Acceptable to proceed to Phase 2 (permissions + auth)

---

## Related docs

- [docs/04_PRISMA_KERNEL.md](../04_PRISMA_KERNEL.md)
- [docs/01_MODULAR_MONOLITH_BOUNDARIES.md](../01_MODULAR_MONOLITH_BOUNDARIES.md)
- [docs/00_README.md](../00_README.md)

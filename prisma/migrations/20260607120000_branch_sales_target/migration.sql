-- CreateTable
CREATE TABLE "BranchSalesTarget" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "monthlyTotal" DECIMAL(18,2) NOT NULL,
    "weekPattern" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchSalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchSalesTarget_branchId_year_month_key" ON "BranchSalesTarget"("branchId", "year", "month");

-- CreateIndex
CREATE INDEX "BranchSalesTarget_branchId_year_month_idx" ON "BranchSalesTarget"("branchId", "year", "month");

-- AddForeignKey
ALTER TABLE "BranchSalesTarget" ADD CONSTRAINT "BranchSalesTarget_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

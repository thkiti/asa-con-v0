-- CreateEnum
CREATE TYPE "BankStatementStatus" AS ENUM ('NEW', 'DRAFT', 'READY');

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "statementNo" TEXT NOT NULL,
    "statementDate" DATE NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL,
    "closingBalance" DECIMAL(18,2) NOT NULL,
    "status" "BankStatementStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByStaffId" TEXT,
    "updatedByStaffId" TEXT,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementLine" (
    "id" TEXT NOT NULL,
    "bankStatementId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "transactionDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "chequeNumber" TEXT,
    "depositAmount" DECIMAL(18,2),
    "withdrawalAmount" DECIMAL(18,2),
    "runningBalance" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankStatement_legalEntityCode_statementNo_key" ON "BankStatement"("legalEntityCode", "statementNo");

-- CreateIndex
CREATE INDEX "BankStatement_legalEntityCode_periodKey_idx" ON "BankStatement"("legalEntityCode", "periodKey");

-- CreateIndex
CREATE INDEX "BankStatement_legalEntityCode_bankAccountId_periodKey_idx" ON "BankStatement"("legalEntityCode", "bankAccountId", "periodKey");

-- CreateIndex
CREATE INDEX "BankStatement_legalEntityCode_status_idx" ON "BankStatement"("legalEntityCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementLine_bankStatementId_lineNo_key" ON "BankStatementLine"("bankStatementId", "lineNo");

-- CreateIndex
CREATE INDEX "BankStatementLine_bankStatementId_idx" ON "BankStatementLine"("bankStatementId");

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

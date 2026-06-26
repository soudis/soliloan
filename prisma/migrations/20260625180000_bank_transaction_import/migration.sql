-- AlterTable
ALTER TABLE "BankConnection" ADD COLUMN "lastImportedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BankImportBatch" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "remittanceInfo" TEXT,
    "raw" JSONB NOT NULL,
    "suggestedLenderId" TEXT,
    "suggestedLoanId" TEXT,
    "selectedLenderId" TEXT,
    "selectedLoanId" TEXT,
    "selectedType" "TransactionType",

    CONSTRAINT "BankImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedBankTransaction" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankImportBatch_projectId_key" ON "BankImportBatch"("projectId");

-- CreateIndex
CREATE INDEX "BankImportRow_batchId_idx" ON "BankImportRow"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "BankImportRow_batchId_bankTransactionId_key" ON "BankImportRow"("batchId", "bankTransactionId");

-- CreateIndex
CREATE INDEX "ImportedBankTransaction_connectionId_idx" ON "ImportedBankTransaction"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedBankTransaction_connectionId_bankTransactionId_key" ON "ImportedBankTransaction"("connectionId", "bankTransactionId");

-- AddForeignKey
ALTER TABLE "BankImportBatch" ADD CONSTRAINT "BankImportBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankImportRow" ADD CONSTRAINT "BankImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BankImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedBankTransaction" ADD CONSTRAINT "ImportedBankTransaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

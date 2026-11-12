-- AlterEnum
ALTER TYPE "Entity" ADD VALUE 'import';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'INTERESTCARRYOVER';

-- AlterTable
ALTER TABLE "Lender" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "importId" TEXT;

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "settings" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Import_projectId_idx" ON "Import"("projectId");

-- CreateIndex
CREATE INDEX "Lender_importId_idx" ON "Lender"("importId");

-- CreateIndex
CREATE INDEX "Loan_importId_idx" ON "Loan"("importId");

-- CreateIndex
CREATE INDEX "Transaction_importId_idx" ON "Transaction"("importId");

-- CreateIndex
CREATE INDEX "Note_importId_idx" ON "Note"("importId");

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lender" ADD CONSTRAINT "Lender_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT,
    "institutionLogo" TEXT,
    "status" TEXT NOT NULL,
    "agreementId" TEXT,
    "accountIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_requisitionId_key" ON "BankConnection"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_reference_key" ON "BankConnection"("reference");

-- CreateIndex
CREATE INDEX "BankConnection_projectId_idx" ON "BankConnection"("projectId");

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

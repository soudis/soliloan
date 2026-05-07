-- AlterEnum
ALTER TYPE "TemplateDataset" ADD VALUE 'USER';
ALTER TYPE "TemplateDataset" ADD VALUE 'LENDER_YEARLY';

-- AlterTable
ALTER TABLE "CommunicationTemplate" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunicationTemplate" ADD COLUMN "systemKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationTemplate_systemKey_key" ON "CommunicationTemplate"("systemKey");

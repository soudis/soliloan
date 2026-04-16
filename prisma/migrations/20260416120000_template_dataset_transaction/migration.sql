-- AlterEnum
ALTER TYPE "TemplateDataset" ADD VALUE 'TRANSACTION';

-- Data: system template for transaction emails targets a specific transaction, not only a loan
UPDATE "CommunicationTemplate"
SET "dataset" = 'TRANSACTION'::"TemplateDataset"
WHERE "systemKey" = 'transaction-notification-email';

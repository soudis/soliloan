-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ONLINE', 'EMAIL', 'POST');

-- AlterEnum
ALTER TYPE "TemplateDataset" ADD VALUE 'TRANSACTION';

-- DropIndex
DROP INDEX "CommunicationTemplate_systemKey_global_unique";

-- AlterTable
ALTER TABLE "Lender" ADD COLUMN     "notificationType" "NotificationType" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "PredefinedCraftBlock" ALTER COLUMN "templateTypes" DROP DEFAULT;

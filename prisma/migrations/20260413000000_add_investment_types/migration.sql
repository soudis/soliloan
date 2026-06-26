-- CreateEnum
CREATE TYPE "LimitationType" AS ENUM ('NOT_MORE_THAN_N_UNITS', 'TOTAL_AMOUNT_OVER_TIME_PERIOD');

-- AlterEnum
ALTER TYPE "Entity" ADD VALUE 'investment_type';

-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN "deInvestmentActCompliance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "investmentTypeId" TEXT;

-- CreateTable
CREATE TABLE "InvestmentType" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "limitationType" "LimitationType" NOT NULL,
    "name" TEXT,

    CONSTRAINT "InvestmentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentType_projectId_interestRate_key" ON "InvestmentType"("projectId", "interestRate");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_investmentTypeId_fkey" FOREIGN KEY ("investmentTypeId") REFERENCES "InvestmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentType" ADD CONSTRAINT "InvestmentType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

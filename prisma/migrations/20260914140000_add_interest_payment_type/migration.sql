-- CreateEnum
CREATE TYPE "InterestPaymentType" AS ENUM ('YEARLY', 'END');

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "interestPaymentType" "InterestPaymentType" NOT NULL DEFAULT 'YEARLY';

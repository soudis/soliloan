/*
  Warnings:

  - The values [dark,light] on the enum `SoliLoansTheme` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Change` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Change` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Change` table. All the data in the column will be lost.
  - You are about to drop the column `customLoans` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `lenderMembershipStatus` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `lenderNotificationType` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `lenderTags` on the `Configuration` table. All the data in the column will be lost.
  - You are about to drop the column `membershipStatus` on the `Lender` table. All the data in the column will be lost.
  - You are about to drop the column `notificationType` on the `Lender` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `Lender` table. All the data in the column will be lost.
  - You are about to drop the column `test` on the `Lender` table. All the data in the column will be lost.
  - You are about to drop the column `interestPaymentType` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `interestPayoutType` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `interestPaymentType` on the `LoanTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `interestPayoutType` on the `LoanTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `interestMethod` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `after` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `before` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `committedAt` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `context` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operation` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryKey` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Made the column `interestMethod` on table `Configuration` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `createdById` to the `File` table without a default value. This is not possible if the table is not empty.
  - Made the column `lenderId` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lenderId` on table `Note` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Operation" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "Entity" AS ENUM ('configuration', 'lender', 'loan', 'transaction', 'file', 'note');

-- CreateEnum
CREATE TYPE "LenderRequiredField" AS ENUM ('address', 'email', 'telNo');

-- AlterEnum
BEGIN;
CREATE TYPE "SoliLoansTheme_new" AS ENUM ('default', 'ocean', 'forest', 'sunset', 'lavender');
ALTER TABLE "User" ALTER COLUMN "theme" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "theme" TYPE "SoliLoansTheme_new" USING ("theme"::text::"SoliLoansTheme_new");
ALTER TABLE "Configuration" ALTER COLUMN "userTheme" TYPE "SoliLoansTheme_new" USING ("userTheme"::text::"SoliLoansTheme_new");
ALTER TYPE "SoliLoansTheme" RENAME TO "SoliLoansTheme_old";
ALTER TYPE "SoliLoansTheme_new" RENAME TO "SoliLoansTheme";
DROP TYPE "SoliLoansTheme_old";
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'default';
COMMIT;

-- AlterEnum
ALTER TYPE "ViewType" ADD VALUE 'LOGBOOK';

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_loanId_fkey";

-- AlterTable
ALTER TABLE "Change" DROP COLUMN "createdAt",
DROP COLUMN "data",
DROP COLUMN "type",
ADD COLUMN     "after" JSONB NOT NULL,
ADD COLUMN     "before" JSONB NOT NULL,
ADD COLUMN     "committedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "context" JSONB NOT NULL,
ADD COLUMN     "entity" "Entity" NOT NULL,
ADD COLUMN     "operation" "Operation" NOT NULL,
ADD COLUMN     "primaryKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Configuration" DROP COLUMN "customLoans",
DROP COLUMN "lenderMembershipStatus",
DROP COLUMN "lenderNotificationType",
DROP COLUMN "lenderTags",
ADD COLUMN     "lenderAdditionalFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "lenderRequiredFields" "LenderRequiredField"[],
ADD COLUMN     "loanAdditionalFields" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "interestMethod" SET NOT NULL;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT NOT NULL,
ALTER COLUMN "lenderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lender" DROP COLUMN "membershipStatus",
DROP COLUMN "notificationType",
DROP COLUMN "tag",
DROP COLUMN "test",
ADD COLUMN     "additionalFields" JSONB;

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "interestPaymentType",
DROP COLUMN "interestPayoutType",
ADD COLUMN     "additionalFields" JSONB;

-- AlterTable
ALTER TABLE "LoanTemplate" DROP COLUMN "interestPaymentType",
DROP COLUMN "interestPayoutType",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "lenderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "interestMethod";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "note";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastInvited" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "InterestPaymentType";

-- DropEnum
DROP TYPE "InterestPayoutType";

-- DropEnum
DROP TYPE "MembershipStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

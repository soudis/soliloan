-- DropIndex
DROP INDEX "Lender_lenderNumber_key";

-- DropIndex
DROP INDEX "Loan_loanNumber_key";

-- AlterTable: remove autoincrement default from Lender.lenderNumber
ALTER TABLE "Lender" ALTER COLUMN "lenderNumber" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "Lender_lenderNumber_seq";

-- AlterTable: remove autoincrement default from Loan.loanNumber
ALTER TABLE "Loan" ALTER COLUMN "loanNumber" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "Loan_loanNumber_seq";

-- AlterTable: Lender.lenderNumber from SERIAL (Int) to VARCHAR(50)
-- Drop the old unique index on lenderNumber
DROP INDEX IF EXISTS "Lender_lenderNumber_key";

-- Remove the default (autoincrement sequence) from lenderNumber
ALTER TABLE "Lender" ALTER COLUMN "lenderNumber" DROP DEFAULT;

-- Convert existing integer values to text
ALTER TABLE "Lender" ALTER COLUMN "lenderNumber" SET DATA TYPE VARCHAR(50) USING "lenderNumber"::VARCHAR(50);

-- Drop the old sequence if it exists
DROP SEQUENCE IF EXISTS "Lender_lenderNumber_seq";

-- Add compound unique index on (projectId, lenderNumber)
CREATE UNIQUE INDEX "Lender_projectId_lenderNumber_key" ON "Lender"("projectId", "lenderNumber");

-- AlterTable: Loan.loanNumber from SERIAL (Int) to VARCHAR(50)
-- Drop the old unique index on loanNumber
DROP INDEX IF EXISTS "Loan_loanNumber_key";

-- Remove the default (autoincrement sequence) from loanNumber
ALTER TABLE "Loan" ALTER COLUMN "loanNumber" DROP DEFAULT;

-- Convert existing integer values to text
ALTER TABLE "Loan" ALTER COLUMN "loanNumber" SET DATA TYPE VARCHAR(50) USING "loanNumber"::VARCHAR(50);

-- Drop the old sequence if it exists
DROP SEQUENCE IF EXISTS "Loan_loanNumber_seq";

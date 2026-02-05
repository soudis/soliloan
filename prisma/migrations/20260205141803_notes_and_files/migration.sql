/*
  Warnings:

  - Made the column `lenderId` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lenderId` on table `Note` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_lenderId_fkey";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "lenderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "lenderId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

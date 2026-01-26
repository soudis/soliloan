/*
  Warnings:

  - The values [configuration] on the enum `Entity` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Entity_new" AS ENUM ('project', 'lender', 'loan', 'transaction', 'file', 'note');
ALTER TABLE "Change" ALTER COLUMN "entity" TYPE "Entity_new" USING ("entity"::text::"Entity_new");
ALTER TYPE "Entity" RENAME TO "Entity_old";
ALTER TYPE "Entity_new" RENAME TO "Entity";
DROP TYPE "Entity_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ViewType" ADD VALUE 'PROJECT';

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_lenderId_fkey";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "lenderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "lenderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

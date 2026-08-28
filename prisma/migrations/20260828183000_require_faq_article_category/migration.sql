-- Root articles are no longer allowed; drop any leftover uncategorized rows.
DELETE FROM "FaqArticle" WHERE "categoryId" IS NULL;

ALTER TABLE "FaqArticle" DROP CONSTRAINT "FaqArticle_categoryId_fkey";

ALTER TABLE "FaqArticle" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "FaqArticle" ADD CONSTRAINT "FaqArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing lenders before enforcing the required country invariant.
UPDATE "Lender" AS lender
SET "country" = COALESCE(configuration."lenderCountry", configuration."country", 'DE'::"Country")
FROM "Project" AS project
JOIN "Configuration" AS configuration ON configuration."id" = project."configurationId"
WHERE lender."projectId" = project."id"
  AND lender."country" IS NULL;

-- If any orphaned legacy data exists, keep the NOT NULL migration from failing.
UPDATE "Lender"
SET "country" = 'DE'::"Country"
WHERE "country" IS NULL;

ALTER TABLE "Lender" ALTER COLUMN "country" SET NOT NULL;

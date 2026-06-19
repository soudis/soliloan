-- Drop theme columns and enum (color scheme themes removed in favor of client-side light/dark mode)

ALTER TABLE "User" DROP COLUMN "theme";

ALTER TABLE "Configuration" DROP COLUMN "userTheme";

DROP TYPE "SoliLoansTheme";

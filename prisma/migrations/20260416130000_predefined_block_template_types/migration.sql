-- AlterTable
ALTER TABLE "PredefinedCraftBlock" ADD COLUMN "templateTypes" "TemplateType"[] NOT NULL DEFAULT ARRAY['EMAIL', 'DOCUMENT']::"TemplateType"[];

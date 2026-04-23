-- CreateEnum
CREATE TYPE "PredefinedBlockVisibility" AS ENUM ('PROJECT_MANAGERS', 'ADMIN_ONLY');

-- CreateTable
CREATE TABLE "PredefinedCraftBlock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "designJson" JSONB NOT NULL,
    "datasets" "TemplateDataset"[],
    "visibility" "PredefinedBlockVisibility" NOT NULL DEFAULT 'PROJECT_MANAGERS',
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "PredefinedCraftBlock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PredefinedCraftBlock" ADD CONSTRAINT "PredefinedCraftBlock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredefinedCraftBlock" ADD CONSTRAINT "PredefinedCraftBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

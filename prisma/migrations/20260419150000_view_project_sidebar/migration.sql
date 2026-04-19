-- AlterTable
ALTER TABLE "View" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "showInSidebar" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "View_projectId_type_idx" ON "View"("projectId", "type");

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

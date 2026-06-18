-- Enforce a single GLOBAL_DEFAULT dashboard layout. PostgreSQL treats NULLs as distinct in
-- multi-column UNIQUE, so a partial unique index is required (cannot be expressed in the Prisma schema).
CREATE UNIQUE INDEX IF NOT EXISTS "DashboardLayout_global_default_key" ON "DashboardLayout"("scope")
WHERE "scope" = 'GLOBAL_DEFAULT';

-- Tie the scope to its owning column so a row can never reference the wrong target
-- (e.g. a PROJECT layout without a projectId, or a GLOBAL_DEFAULT pointing at a user).
ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_scope_target_check" CHECK (
  (scope = 'PROJECT' AND "projectId" IS NOT NULL AND "userId" IS NULL)
  OR (scope = 'USER' AND "userId" IS NOT NULL AND "projectId" IS NULL)
  OR (scope = 'GLOBAL_DEFAULT' AND "projectId" IS NULL AND "userId" IS NULL)
);

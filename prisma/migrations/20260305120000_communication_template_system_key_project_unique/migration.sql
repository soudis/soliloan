-- Drop single-column unique on systemKey
DROP INDEX IF EXISTS "CommunicationTemplate_systemKey_key";

-- Composite uniqueness: same systemKey may exist once per project (and once with NULL projectId for global)
CREATE UNIQUE INDEX "CommunicationTemplate_systemKey_projectId_key" ON "CommunicationTemplate"("systemKey", "projectId");

-- Enforce a single global row per systemKey (NULLs are not equal in PostgreSQL composite UNIQUE)
CREATE UNIQUE INDEX "CommunicationTemplate_systemKey_global_unique" ON "CommunicationTemplate"("systemKey")
WHERE "projectId" IS NULL AND "systemKey" IS NOT NULL;

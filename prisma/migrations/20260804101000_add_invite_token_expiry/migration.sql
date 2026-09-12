-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteTokenExpiresAt" TIMESTAMP(3);

-- Give already sent invitations an expiry so they keep working for a bounded window
-- instead of being rejected immediately by the new check.
UPDATE "User"
SET "inviteTokenExpiresAt" = COALESCE("lastInvited", CURRENT_TIMESTAMP) + INTERVAL '14 days'
WHERE "inviteToken" IS NOT NULL;

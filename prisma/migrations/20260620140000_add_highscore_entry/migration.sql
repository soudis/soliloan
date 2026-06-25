-- CreateTable
CREATE TABLE "HighscoreEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pseudonym" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "wave" INTEGER NOT NULL,
    "revealIdentity" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HighscoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HighscoreEntry_score_idx" ON "HighscoreEntry"("score");

-- CreateIndex
CREATE INDEX "HighscoreEntry_userId_idx" ON "HighscoreEntry"("userId");

-- AddForeignKey
ALTER TABLE "HighscoreEntry" ADD CONSTRAINT "HighscoreEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - Made the column `content` on table `Podcast` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Podcast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "transcriptId" TEXT,
    "title" TEXT NOT NULL,
    "duration" INTEGER,
    "storageKey" TEXT,
    "fileSize" INTEGER,
    "content" TEXT NOT NULL,
    "voiceConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Podcast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Podcast_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Podcast" ("content", "createdAt", "duration", "fileSize", "id", "storageKey", "title", "transcriptId", "updatedAt", "userId", "voiceConfig") SELECT "content", "createdAt", "duration", "fileSize", "id", "storageKey", "title", "transcriptId", "updatedAt", "userId", "voiceConfig" FROM "Podcast";
DROP TABLE "Podcast";
ALTER TABLE "new_Podcast" RENAME TO "Podcast";
CREATE UNIQUE INDEX "Podcast_transcriptId_key" ON "Podcast"("transcriptId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

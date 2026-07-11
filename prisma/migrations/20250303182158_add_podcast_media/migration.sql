-- CreateTable
CREATE TABLE "PodcastMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "podcastId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "storageKey" TEXT,
    "duration" INTEGER,
    "speakerId" TEXT,
    "segmentText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PodcastMedia_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

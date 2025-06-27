-- CreateTable
CREATE TABLE "UserStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "dailyPoints" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceTime" INTEGER NOT NULL DEFAULT 0,
    "lastReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStat_userId_serverId_key" ON "UserStat"("userId", "serverId");

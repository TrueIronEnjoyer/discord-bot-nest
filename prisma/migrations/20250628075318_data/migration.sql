-- CreateTable
CREATE TABLE "UserStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "coins" BIGINT NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStat_userId_serverId_key" ON "UserStat"("userId", "serverId");

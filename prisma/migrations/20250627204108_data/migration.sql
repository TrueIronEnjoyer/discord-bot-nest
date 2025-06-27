/*
  Warnings:

  - You are about to alter the column `allPoints` on the `UserStat` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `dailyPoints` on the `UserStat` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `messages` on the `UserStat` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `voiceTime` on the `UserStat` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "dailyPoints" BIGINT NOT NULL DEFAULT 0,
    "allPoints" BIGINT NOT NULL DEFAULT 0,
    "messages" BIGINT NOT NULL DEFAULT 0,
    "voiceTime" BIGINT NOT NULL DEFAULT 0,
    "lastReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_UserStat" ("allPoints", "dailyPoints", "id", "lastReset", "messages", "serverId", "userId", "voiceTime") SELECT "allPoints", "dailyPoints", "id", "lastReset", "messages", "serverId", "userId", "voiceTime" FROM "UserStat";
DROP TABLE "UserStat";
ALTER TABLE "new_UserStat" RENAME TO "UserStat";
CREATE UNIQUE INDEX "UserStat_userId_serverId_key" ON "UserStat"("userId", "serverId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

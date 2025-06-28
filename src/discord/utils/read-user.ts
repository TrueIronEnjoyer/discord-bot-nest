import { UserStat } from "generated/prisma";
import { PrismaClient } from "@prisma/client";

export async function ReadUser(userId: string, serverId: string, prisma: PrismaClient) : Promise<UserStat> {
    const userStat: UserStat = await prisma.userStat.findUnique({
        where: { userId_serverId: { userId, serverId } },
    });

    return userStat;
}
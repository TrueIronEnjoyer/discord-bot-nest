import { UserStat } from "generated/prisma";
import { PrismaClient } from "@prisma/client";

export async function ReadUsersTop(serverId: string, count: number, prisma: PrismaClient) : Promise<UserStat[]> {
    const usersStats = await prisma.userStat.findMany({
        where: { serverId },
        orderBy: { coins: 'desc' },
        take: count,
    });

    return usersStats;
}
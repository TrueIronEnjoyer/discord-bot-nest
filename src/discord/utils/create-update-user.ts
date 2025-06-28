import { PrismaClient } from "@prisma/client";
import { CreateUserStatDto } from "../dto/create-user-stat.dto";


export async function CreateUpdateUser(createUsersDto: CreateUserStatDto, prisma: PrismaClient) {
    const now = new Date();

    const user = await prisma.userStat.upsert({
        where: { userId_serverId: {
            userId:createUsersDto.userId,
            serverId:createUsersDto.serverId }
        },
        update: {},
        create: {
            userId: createUsersDto.userId,
            serverId: createUsersDto.serverId,
            coins: createUsersDto.coins,
        },
    });
    
    await prisma.userStat.update({
        where: { userId_serverId: {
            userId:createUsersDto.userId,
            serverId:createUsersDto.serverId }
        },
        data: {
            coins: {increment: createUsersDto.coins}
        },
    });
  }
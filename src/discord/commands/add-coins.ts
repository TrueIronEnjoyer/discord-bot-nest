import { PrismaClient } from "@prisma/client";
import { EmbedBuilder, Message } from "discord.js";
import { CreateUpdateUser } from "../utils/create-update-user";
import { CreateUserStatDto } from "../dto/create-user-stat.dto";
import { MakeEmbeds } from "../utils/make-embeds-users";

export async function AddCoins(message: Message, prisma: PrismaClient) {
    if (message.guild?.ownerId != message.author.id) {
        await message.reply('Эта команда доступна только владельцу сервера');
        return;
    }

    const mentions = message.mentions.users;
        
    if (!mentions.size) {
        await message.reply('Укажи пользователя: `!addcoins @user количество`');
        return;
    }
    
    const args = message.content.trim().split(/\s+/);
    const amountStr = args[2];
    const amount = parseInt(amountStr, 10);
        
    if (isNaN(amount)) {
        await message.reply('Укажи количество SkamCoins: `!addcoins @user 100`');
        return;
    }
        
    const mentionedUser = mentions.first();
    if (!mentionedUser) return;
        
    const userId = mentionedUser.id;
    const serverId = message.guild?.id ?? 'global';

    let userStat: CreateUserStatDto = {
        userId: userId,
        serverId: serverId,
        coins: BigInt(amount),
    };
    
    await CreateUpdateUser(userStat, prisma);

    const updatedUser = await prisma.userStat.findUnique({
        where: {
            userId_serverId: { userId, serverId },
        },
    });

    const embed: EmbedBuilder = await MakeEmbeds(message.client, [updatedUser], 'Добавлено SkamCoins');

    await message.reply({ embeds: [embed] });
}
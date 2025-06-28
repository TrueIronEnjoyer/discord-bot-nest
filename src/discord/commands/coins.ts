import { PrismaClient } from "@prisma/client";
import { EmbedBuilder, Message } from "discord.js";
import { ReadUser } from "../utils/read-user";
import { MakeEmbeds } from "../utils/make-embeds-users";

export async function Coins(message: Message, prisma: PrismaClient) {
    const mentions = message.mentions.users;
    
    let userId: string = message.author.id;
    if (mentions.size) {
        const mentionedUser = mentions.first();
        if (!mentionedUser) return;
    
        userId = mentionedUser.id;
    }

    const serverId = message.guild?.id ?? 'global';

    const user = await ReadUser(userId, serverId, prisma);
    const embed: EmbedBuilder = await MakeEmbeds(message.client, [user], 'Баланс');
    await message.reply({ embeds: [embed] });
}
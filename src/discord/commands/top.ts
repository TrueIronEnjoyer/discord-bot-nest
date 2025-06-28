import { EmbedBuilder, Message } from "discord.js";
import { ReadUsersTop } from "../utils/read-users-top";
import { PrismaClient } from "@prisma/client";
import { MakeEmbeds } from "../utils/make-embeds-users";

export async function Top(message: Message, prisma: PrismaClient) {
    const args = message.content.trim().split(/\s+/);
    const limit = parseInt(args[1], 10);
    const topLimit = !isNaN(limit) && limit > 0 ? limit : 10;

    const top = await ReadUsersTop(message.guildId || 'global', topLimit, prisma);
    
    const embed: EmbedBuilder = await MakeEmbeds(message.client, top, 'Топ SkamCoin владельцев');
    
    await message.reply({ embeds: [embed] });
}

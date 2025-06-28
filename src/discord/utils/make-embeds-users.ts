import { Client, EmbedBuilder } from "discord.js";
import { UserStat } from "generated/prisma";

export async function MakeEmbeds(client: Client, usersStats: UserStat[], title: string): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor('#f1c40f')
        .setFooter({
            text: new Date().toLocaleString('ru-RU'),
        });


    if (usersStats.length == 1) {
        const user = await client.users.fetch(usersStats[0].userId).catch(() => null);
        const username = user?.username ?? `User ${usersStats[0].userId}`;
        const avatarUrl = user?.displayAvatarURL();
        
        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        embed.addFields({
            name: `${username}`,
            value: `${usersStats[0].coins.toString()} SkamCoins`,
            inline: false,
        });

    } else {
        for (let i = 0; i < usersStats.length; ++i) {
            const user = await client.users.fetch(usersStats[i].userId).catch(() => null);
            const username = user?.username ?? `User ${usersStats[i].userId}`;

            embed.addFields({
                name: `${i + 1}) ${username}`,
                value: `${usersStats[i].coins.toString()} SkamCoins`,
                inline: false,
            });
        }
    }

    return embed;
}

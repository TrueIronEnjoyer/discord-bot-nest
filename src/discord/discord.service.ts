import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, VoiceState, Message, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '../../generated/prisma';
import * as dotenv from 'dotenv';
import { CreateUpdateUser } from './utils/create-update-user';
import { CreateUserStatDto } from './dto/create-user-stat.dto';
import { ReadUser } from './utils/read-user';
import { MakeEmbeds } from './utils/make-embeds-users';
import { ReadUsersTop } from './utils/read-users-top';

dotenv.config();

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;
  private prisma = new PrismaClient();
  private voiceSessions = new Map<string, number>();

  async onModuleInit() { 
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}`);
    });

    this.client.on('messageCreate', (msg) => this.handleMessage(msg));

    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error('Missing DISCORD_TOKEN in .env');
    await this.client.login(token);
  }

  private async handleMessage(message: Message) {
    try{
      if (message.author.bot || !message.guild) return;

      let userStat: CreateUserStatDto = {
        userId: message.author.id,
        serverId: message.guild.id,
        coins: 0n,
      };

    await CreateUpdateUser(userStat, this.prisma);

    if (message.content.startsWith('!coins')) {
      this.coins(message);
    } else if (message.content.startsWith('!top')) {
      this.top(message);
    } else if (message.content.startsWith('!addcoins')) {
      this.addCoins(message);
    }
    } catch(err) {}
  }

  private async addCoins(message: Message) {
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
    
    await CreateUpdateUser(userStat, this.prisma);

    const updatedUser = await ReadUser(userId, serverId, this.prisma);

    const embed: EmbedBuilder = await MakeEmbeds(message.client, [updatedUser], 'Добавлено SkamCoins');

    await message.reply({ embeds: [embed] });
  }

  private async coins(message: Message) {
    const mentions = message.mentions.users;
    
    let userId: string = message.author.id;
    if (mentions.size) {
        const mentionedUser = mentions.first();
        if (!mentionedUser) return;
    
        userId = mentionedUser.id;
    }

    const serverId = message.guild?.id ?? 'global';

    const user = await ReadUser(userId, serverId, this.prisma);
    const embed: EmbedBuilder = await MakeEmbeds(message.client, [user], 'Баланс');
    await message.reply({ embeds: [embed] });
  }

  private async top(message: Message) {
    const args = message.content.trim().split(/\s+/);
    const limit = parseInt(args[1], 10);
    const topLimit = !isNaN(limit) && limit > 0 ? limit : 10;

    const top = await ReadUsersTop(message.guildId || 'global', topLimit, this.prisma);
    
    const embed: EmbedBuilder = await MakeEmbeds(message.client, top, 'Топ SkamCoin владельцев');
    
    await message.reply({ embeds: [embed] });
}


}

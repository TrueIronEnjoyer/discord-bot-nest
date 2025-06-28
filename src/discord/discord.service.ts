import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, VoiceState, Message, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '../../generated/prisma';
import { AddCoins } from './commands/add-coins';
import * as dotenv from 'dotenv';
import { CreateUpdateUser } from './utils/create-update-user';
import { CreateUserStatDto } from './dto/create-user-stat.dto';
import { Coins } from './commands/coins';
import { Top } from './commands/top';

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
      Coins(message, this.prisma);
    } else if (message.content.startsWith('!top')) {
      Top(message, this.prisma);
    } else if (message.content.startsWith('!addcoins')) {
      AddCoins(message, this.prisma);
    }
    } catch(err) {}
  }

}

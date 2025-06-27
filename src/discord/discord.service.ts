import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, VoiceState, Message, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '../../generated/prisma';
import * as dotenv from 'dotenv';

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
    this.client.on('voiceStateUpdate', (oldState, newState) =>
      this.handleVoiceState(oldState, newState),
    );

    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error('Missing DISCORD_TOKEN in .env');
    await this.client.login(token);
  }

  private async handleMessage(message: Message) {
    try{
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const serverId = message.guild.id;

    await this.updateUser(userId, serverId, 1, 0);

    if (message.content === '!coins') {
      const user = await this.prisma.userStat.findUnique({
        where: {
          userId_serverId: {
            userId: userId,
            serverId: serverId,
          }
        }
      });
      const coins = user?.allPoints ?? 0n;
      await sendCoinSummary(message, coins);
    } else if (message.content === '!top') {
      const top = await this.prisma.userStat.findMany({
        where: { serverId },
        orderBy: { allPoints: 'desc' },
        take: 10,
      });

      const rankMsg = top
        .map((u, i) => `${i + 1}) <@${u.userId}> — ${u.allPoints} SkamCoins`)
        .join('\n');

        const dailyTop = await this.prisma.userStat.findMany({
          where: { serverId },
          orderBy: { dailyPoints: 'desc' },
          take: 10,
        });
  
        const rankDailyMsg = top
          .map((u, i) => `${i + 1}) <@${u.userId}> — ${u.dailyPoints} SkamCoins`)
          .join('\n');
  
        if ('send' in message.channel && typeof message.channel.send === 'function') {
          await message.channel.send(`Топ 10 по SkamCoins за день:\n${rankDailyMsg}\nТоп 10 по SkamCoins за всё время:\n${rankMsg}`);
        }
    } else if (message.content.startsWith('!coins')) {
      const mentions = message.mentions.users;
    
      if (!mentions.size) {
        await message.reply('Укажи пользователя: `!coins @user`');
        return;
      }
    
      const mentionedUser = mentions.first();
      if (!mentionedUser) return;
    
      const userId = mentionedUser.id;
      const serverId = message.guild?.id ?? 'global';
    
      const user = await this.prisma.userStat.findUnique({
        where: { userId_serverId: { userId, serverId } },
      });
      if (user?.allPoints != undefined) {
        await message.reply(`У <@${userId}> ${user?.allPoints} SkamCoins`);
      } else {
        await message.reply(`У <@${userId}> 0 SkamCoins`);
      }
    } else if (message.content.startsWith('!addcoins')) {
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
    
      await this.prisma.userStat.upsert({
        where: { userId_serverId: { userId, serverId }},
        update: {
          allPoints: { increment: amount },
        },
        create: {
          userId,
          serverId,
          dailyPoints: 0,
          messages: 0,
          voiceTime: 0,
          allPoints: amount,
          lastReset: new Date(),
        },
      });
      
      await message.reply(`Добавлено ${amount} коинов для <@${userId}>`);
    }
    } catch(err) {}
  }

  private async handleVoiceState(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.id;
    const serverId = newState.guild?.id;
    if (!serverId) return;

    if (!oldState.channel && newState.channel) {
      this.voiceSessions.set(userId + serverId, Date.now());
    }

    if (oldState.channel && !newState.channel) {
      const key = userId + serverId;
      const start = this.voiceSessions.get(key);
      if (!start) return;

      const minutes = Math.floor((Date.now() - start) / 60000);
      this.voiceSessions.delete(key);

      if (minutes > 0) {
        await this.updateUser(userId, serverId, 0, minutes);
      }
    }
  }

  private async updateUser(userId: string, serverId: string, msgInc: number, voiceMin: number) {
    const now = new Date();

    const user = await this.prisma.userStat.upsert({
      where: { userId_serverId: { userId, serverId } },
      update: {},
      create: {
        userId,
        serverId,
        messages: 0,
        voiceTime: 0,
        dailyPoints: 0,
        lastReset: now,
      },
    });

    const isAnotherDay = user.lastReset.toDateString() !== now.toDateString();
    if (isAnotherDay) {
      await this.prisma.userStat.update({
        where: { userId_serverId: { userId, serverId } },
        data: { dailyPoints: 0, lastReset: now },
      });
      user.dailyPoints = 0;
    }

    const totalNew = msgInc + voiceMin;
    const pointsLeft = Math.max(100 - user.dailyPoints, 0);
    const toAdd = Math.min(pointsLeft, totalNew);

    await this.prisma.userStat.update({
      where: { userId_serverId: { userId, serverId } },
      data: {
        messages: { increment: msgInc },
        voiceTime: { increment: voiceMin },
        dailyPoints: { increment: toAdd },
        allPoints: {increment: toAdd}
      },
    });
  }
}

async function sendCoinSummary(message: Message, coins: bigint) {
  const embed = new EmbedBuilder()
    .setTitle('Сводка экономики')
    .setColor('#f1c40f')
    .addFields([
      {
        name: 'SkamCoins',
        value: `${coins}`,
        inline: true,
      },
    ])
    .setThumbnail(message.author.displayAvatarURL())
    .setFooter({
      text: `Вызвал ${message.author.username} • ${new Date().toLocaleString('ru-RU')}`,
    });

  await message.reply({ embeds: [embed] });
}
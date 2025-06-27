import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, VoiceState, Message } from 'discord.js';
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
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const serverId = message.guild.id;

    await this.updateUser(userId, serverId, 1, 0);

    if (message.content === '/score') {
      const user = await this.prisma.userStat.findUnique({
        where: { userId_serverId: { userId, serverId } },
      });

      await message.reply(
        `Ты набрал сегодня ${user?.dailyPoints ?? 0}/100 очков.\nТы набрал за всё время всего ${user?.allPoints ?? 0}`,
      );
    }

    if (message.content === '/top') {
      const top = await this.prisma.userStat.findMany({
        where: { serverId },
        orderBy: { allPoints: 'desc' },
        take: 10,
      });

      const rankMsg = top
        .map((u, i) => `${i + 1}) <@${u.userId}> — ${u.allPoints} очков`)
        .join('\n');

        const dailyTop = await this.prisma.userStat.findMany({
          where: { serverId },
          orderBy: { dailyPoints: 'desc' },
          take: 10,
        });
  
        const rankDailyMsg = top
          .map((u, i) => `${i + 1}) <@${u.userId}> — ${u.dailyPoints} очков`)
          .join('\n');
  
        if ('send' in message.channel && typeof message.channel.send === 'function') {
          await message.channel.send(`Топ 10 по очкам за день:\n${rankDailyMsg}\nТоп 10 по очкам за всё время:\n${rankMsg}`);
        }
    }
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

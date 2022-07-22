import {Injectable, Logger} from '@nestjs/common';
import * as ds from "discord.js";
import {DVoice} from "../modules/voice";
import {DMenu} from "../modules/menu";
import {DMusic} from "../modules/music";
import {DTool} from "../modules/tools";

@Injectable()
export class DiscordService {

	constructor(
		private music: DMusic,
		private menu: DMenu,
		private tools: DTool,
	) {
		this.init().then(() => null);
	}

	private logger = new Logger(DiscordService.name);

	private client: ds.Client;
	private guild: ds.Guild;

	/**
	 * It logs the bot into Discord and fetches the guild
	 */
	async init() {
		this.client = new ds.Client({
			intents: [
				ds.Intents.FLAGS.GUILDS,
				ds.Intents.FLAGS.GUILD_BANS,
				ds.Intents.FLAGS.GUILD_MEMBERS,
				ds.Intents.FLAGS.GUILD_INVITES,
				ds.Intents.FLAGS.GUILD_MESSAGES,
				ds.Intents.FLAGS.DIRECT_MESSAGES,
				ds.Intents.FLAGS.GUILD_PRESENCES,
				ds.Intents.FLAGS.GUILD_VOICE_STATES,
				ds.Intents.FLAGS.DIRECT_MESSAGE_TYPING,
				ds.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				ds.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
				ds.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
			]
		});
		await this.client.login(process.env.DISCORD_KEY);
		this.guild = await this.client.guilds.fetch(`437601028662231040`);
		await this.music.init(this.guild);
		this.menu.init(this.client, this.guild, this.music);
		await this.run();
	}

	private async messageReaction(msg: ds.Message<boolean>) {
		if (msg.channelId === `869957685326524456`) await msg.crosspost();
		if (msg.channelId === `981988092598706288`) await msg.crosspost();
		if (msg.channelId === `986037014619099206`) await msg.crosspost();

		if (msg.author.bot) return;

		if (msg.channelId === `983133016681492551`) {
			await msg.delete();
			const w = this.menu.waiting.filter(s => s.id === msg.author.id);
			if (w.length === 0) return;
			if (w[0].s === `limit`) {
				if (isNaN(parseInt(msg.content))) {
					const m = await msg.channel.send({content: `Это не число`});
					this.tools.msgDelete(m, 1000 * 10);
					return;
				}
				if (parseInt(msg.content) < 0 || parseInt(msg.content) > 20) {
					const m = await msg.channel.send({content: `Число должно быть от 0 до 20`});
					this.tools.msgDelete(m, 1000 * 10);
					return;
				}
				await this.menu.changeVoiceLimit(msg.author.id, parseInt(msg.content));
			} else if (w[0].s === `name`) {
				if (msg.content.length > 25) {
					const m = await msg.channel.send({content: `Строка должна быть короче 25 символов`});
					this.tools.msgDelete(m, 1000 * 10);
					return;
				}
				await this.menu.changeVoiceName(msg.author.id, msg.content);
			} else if (w[0].s === `music`) {
				if (!msg.content.startsWith(`http`)) {
					const m = await msg.channel.send({content: `Не похоже на ссылку`});
					this.tools.msgDelete(m, 1000 * 10);
					return;
				}
				if (!msg.content.includes(`youtube`)) {
					const m = await msg.channel.send({content: `Нужны ссылки только с ютуба`});
					this.tools.msgDelete(m, 1000 * 10);
					return;
				}
				const force = await this.tools.isMod(msg.author.id);
				const m = await msg.channel.send({content: await this.menu.playMusic(msg.author.id, msg.content, force)});
				this.tools.msgDelete(m, 1000 * 10);
			}
		}
	}

	/**
	 * When the client is ready, log that it's ready, and when a message is created, run the
	 * messageReaction function
	 */
	private async run() {
		this.client.on(`ready`, async () => {
			this.logger.log(`✅ Discord ready`);
		});

		this.client.on(`messageCreate`, async msg => await this.messageReaction(msg));
	}
}

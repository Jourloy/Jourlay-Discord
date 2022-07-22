import {Injectable, Logger} from '@nestjs/common';
import * as ds from "discord.js";
import {DVoice} from "../modules/voice";

@Injectable()
export class DiscordService {

	constructor() {
		this.init().then(() => null);
	}

	private logger = new Logger(DiscordService.name);

	private client: ds.Client;
	private guild: ds.Guild;

	private voice = new DVoice();

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
		this.voice.init(this.client, this.guild);
		await this.run();
	}

	private async messageReaction(msg: ds.Message<boolean>) {
		if (msg.channelId === `869957685326524456`) await msg.crosspost();
		if (msg.channelId === `981988092598706288`) await msg.crosspost();
		if (msg.channelId === `986037014619099206`) await msg.crosspost();

		if (msg.author.bot) return;
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

import { DiscordMusicType } from 'types';

import * as voice from '@discordjs/voice';
import * as ds from 'discord.js';
import * as play from 'play-dl';
import { Cron } from '@nestjs/schedule';

export class DMusic {
	public information: DiscordMusicType.Information = null;

	/**
	 * Send any message in channel
	 */
	private async sendInChannel(opt: {
		channelID: string;
		message: string | ds.MessagePayload | ds.MessageOptions;
	}): Promise<{ error: boolean; errorMessage?: string }> {
		const channel = await this.information.client.channels.fetch(opt.channelID);

		if (channel.isText()) {
			channel.send(opt.message);
			return { error: false };
		} else if (channel.isThread()) {
			return { error: true, errorMessage: `This is thread` };
		} else if (channel.isVoice()) {
			return { error: true, errorMessage: `This is voice channel` };
		}
		return { error: true, errorMessage: `Unknown type of channel` };

	}

	/**
	 * Check amount users in voice channel
	 */
	@Cron(`* */1 * * * *`)
	private async checkMusicChannel() {
		if (!this.information) return;
		if (this.information.channelID === ``) return;

		this.information.guild.channels
			.fetch(this.information.channelID)
			.then((ch: ds.VoiceChannel) => {
				if (ch.members.toJSON().length < 1) {
					setTimeout(() => {
						if (ch.members.toJSON().length < 1) this.stopSong();
					}, 1000 * 60 * 5);
				}
			});
	}

	/**
	 * Initialization music class
	 */
	public async init(guild: ds.Guild) {
		this.information = {
			state: false,
			onPause: false,
			queue: [],
			nowPlaying: null,
			authorID: ``,
			connection: null,
			player: voice.createAudioPlayer(),
			guild: guild,
			updated: Date.now(),
			channelID: ``,
			client: null,
		};

		this.handler();
	}

	/**
	 * Connectig to channel and create connection
	 */
	private async connectToChannel(
		channel: ds.VoiceChannel | ds.StageChannel
	): Promise<DiscordMusicType.Return> {
		const connection = voice.joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: this.information.guild.voiceAdapterCreator as unknown as voice.DiscordGatewayAdapterCreator,
		});
		try {
			await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30e3);
			this.information.connection = connection;
			this.information.channelID = channel.id;
			return { error: false, content: `Success` };
		} catch (err) {
			connection.destroy();
			return { error: true, errorMessage: err };
		}
	}

	/**
	 * Start timeout on state change
	 */
	private handler() {
		this.information.player.on(`stateChange`, async (oldState, newState) => {
			if (this.information.state === false) return;
			if (this.information.onPause === true) return;

			if (
				newState.status === voice.AudioPlayerStatus.Idle &&
				this.information.queue.length === 0
			) {
				const now = Date.now();
				setTimeout(() => {
					if (now >= this.information.updated) {
						this.information.connection.disconnect();
						this.init(this.information.guild);
					}
				}, 1000 * 60 * 5);
			}

			if (
				newState.status === voice.AudioPlayerStatus.Idle &&
				this.information.queue.length > 0
			) {
				this.information.player.stop();
				this.information.connection.subscribe(this.information.player);
				const url = this.information.queue.shift();
				const res = await this.playSong(url);
				if (res.error) {
					if (this.information.client != null) {
						this.sendInChannel({
							channelID: `917132649603162212`,
							message: `<@${url.authorID}>, ошибка запуска музыки. Песня либо 18+, либо попробуй скинуть другую ссылку без всяких параметров`,
						});
					}
				}
			}
		});
	}

	/**
	 * Start play a song
	 */
	private async playSong(
		opt: DiscordMusicType.QueueRequest
	): Promise<DiscordMusicType.Return> {
		try {
			this.information.nowPlaying = opt;
			const stream = await play.stream(opt.url);
			const resource = voice.createAudioResource(stream.stream, {
				inputType: stream.type,
			});

			this.information.player.play(resource);
			this.information.connection.subscribe(this.information.player);

			this.information.state = true;
			this.information.updated = Date.now();

			await voice.entersState(this.information.player, voice.AudioPlayerStatus.Playing, 5e3);

			return { error: false, content: `Success` };
		} catch (err) {
			return { error: true, errorMessage: err };
		}
	}

	private async stopSong() {
		this.information.player.stop();
		this.information.connection.subscribe(this.information.player);
		this.information.connection.disconnect();

		this.init(this.information.guild);
	}

	private async pauseSong() {
		this.information.player.pause(true);
		this.information.connection.subscribe(this.information.player);

		this.information.onPause = true;
		this.information.updated = Date.now();
	}

	private async unPauseSong() {
		this.information.player.unpause();
		this.information.connection.subscribe(this.information.player);

		this.information.onPause = false;
		this.information.updated = Date.now();
	}

	private async skipSong() {
		this.information.player.stop();
		this.information.connection.subscribe(this.information.player);
		const url = this.information.queue.shift();
		const res = await this.playSong(url);
		if (res.error) {
			this.sendInChannel({
				channelID: `917132649603162212`,
				message: `<@${url.authorID}>, ошибка запуска музыки. Песня либо 18+, либо попробуй скинуть другую ссылку без всяких параметров`,
			});
		}
	}

	async play(opt: DiscordMusicType.PlayTypes): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			const connectResult = await this.connectToChannel(opt.channel);
			if (connectResult.error) {
				return { error: true, errorMessage: `Ошибка подключения к каналу` };
			}
			this.information.authorID = opt.authorID;
			this.information.channelID = opt.channel.id;
			this.information.client = opt.client;
			const playResult = await this.playSong({ url: opt.url, authorID: opt.authorID });
			if (playResult.error) {
				return {
					error: true,
					errorMessage:
						`Ошибка запуска музыки. Песня либо 18+, либо попробуй скинуть другую ссылку без всяких параметров`,
				};
			}
			return { error: false, content: `Музыка запущена | ${opt.url}`, contentType: `string` };
		} else if (opt.channelID === this.information.channelID) {
			this.information.queue.push({ url: opt.url, authorID: opt.authorID });
			return { error: false, content: `Музыка добавлена в очередь | ${opt.url}`, contentType: `string` };
		}
		return {
			error: true,
			errorMessage: `Кажется ты не в том голосовом канале, в котором запущен бот`,
		};

	}

	async stop(authorID: string, force: boolean): Promise<string> {
		if (this.information.state === false) {
			return `Музыка не активна`;
		}

		if (this.information.authorID === authorID || force) {
			await this.stopSong();
			return `Музыка остановлена, очередь очищена`;
		}

		if (this.information.authorID !== authorID) {
			return `Вы не можете управлять очередью`;
		}
	}

	async pause(opt: DiscordMusicType.PauseTypes): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			return { error: true, errorMessage: `Бот не активен` };
		} else if (this.information.nowPlaying === null) {
			return { error: true, errorMessage: `Сейчас ничего не играет` };
		} else if (this.information.onPause) {
			return { error: true, errorMessage: `Музыка уже на паузе` };
		} else if (opt.channelID === this.information.channelID) {
			await this.pauseSong();
			return { error: false, content: `Музыка поставлена на паузу` };
		}
		return {
			error: true,
			errorMessage: `Кажется ты не в том голосовом канале, в котором запущен бот`,
		};

	}

	async unPause(opt: DiscordMusicType.PauseTypes): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			return { error: true, errorMessage: `Бот не активен` };
		} else if (this.information.nowPlaying === null) {
			return { error: true, errorMessage: `Сейчас ничего не играет` };
		} else if (!this.information.onPause) {
			return { error: true, errorMessage: `Музыка уже снята с паузы` };
		} else if (opt.channelID === this.information.channelID) {
			await this.unPauseSong();
			return { error: false, content: `Музыка cнята с паузы` };
		}
		return {
			error: true,
			errorMessage: `Кажется ты не в том голосовом канале, в котором запущен бот`,
		};

	}

	async skip(opt: DiscordMusicType.PauseTypes): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			return { error: true, errorMessage: `Бот не активен` };
		} else if (this.information.queue.length < 1) {
			return { error: true, errorMessage: `Очередь пуста` };
		} else if (opt.channelID === this.information.channelID) {
			await this.skipSong();
			return { error: false, content: `Музыка пропущена` };
		}
		return {
			error: true,
			errorMessage: `Кажется ты не в том голосовом канале, в котором запущен бот`,
		};

	}

	async clearQueue(authorID: string, force: boolean): Promise<string> {
		if (this.information.state === false) {
			return `Музыка не активна`;
		}

		if (this.information.authorID === authorID || force) {
			this.information.queue = [];
			return `Очередь сброшена`;
		}

		if (this.information.authorID !== authorID) {
			return `Вы не можете управлять музыкой`;
		}
	}

	async getQueue() {
		if (this.information.state === false) {
			return `Музыка не активна`;
		}

		if (this.information.queue.length === 0) {
			return `Очередь пуста`;
		}

		return this.information.queue;
	}

	async getNowSong(): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			return { error: true, errorMessage: `Бот не активен` };
		} else if (this.information.nowPlaying === null) {
			return { error: true, errorMessage: `Сейчас ничего не играет` };
		}
		return {
			error: false,
			content: this.information.nowPlaying,
		};

	}

	async changeQueueOwner(
		opt: DiscordMusicType.ChangeQueueOwnerTypes
	): Promise<DiscordMusicType.Return> {
		if (this.information.state === false) {
			return { error: true, errorMessage: `Бот не активен` };
		} else if (this.information.authorID !== opt.ownerID) {
			return { error: true, errorMessage: `Ты не можешь управлять очередью` };
		} else if (this.information.authorID === opt.nextOwnerID) {
			return { error: true, errorMessage: `<@${opt.nextOwnerID}> уже владеет очередью` };
		}
		this.information.authorID = opt.nextOwnerID;
		return { error: false, content: `теперь <@${opt.nextOwnerID}> владеет очередью` };

	}
}
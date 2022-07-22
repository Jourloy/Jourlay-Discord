import {Model} from "mongoose";
import * as ds from "discord.js";
import {InjectModel} from "@nestjs/mongoose";
import {DMusic} from "./music";
import {DiscordVoice, DiscordVoiceDocument} from "../schemas/voiceChannel.schema";

export class DMenu {
	private client: ds.Client;
	private guild: ds.Guild;
	private dMusic: DMusic;
	public waiting: Waiting[] = [];

	constructor(
		@InjectModel(DiscordVoice.name) private DiscordVoiceModel: Model<DiscordVoiceDocument>,
	) {}

	public init(c: ds.Client, g: ds.Guild, m: DMusic) {
		this.client = c;
		this.guild = g;
		this.dMusic = m;
		this.settingChannels();
	}

	public async changeVoiceLimit(userID: string, l: number) {
		const c = await this.DiscordVoiceModel.findOne({ownerID: userID}).exec();
		c.limit = l;
		await c.save();
		const channel = await this.guild.channels.fetch(c.channelID);
		if (channel.isVoice()) await channel.edit({userLimit: (l === 0) ? null : l});
		this.filterArray(userID);
	}

	public async playMusic(userID: string, url: string, force: boolean) {
		const c = await this.DiscordVoiceModel.findOne({ownerID: userID}).exec();
		const channel = await this.guild.channels.fetch(c.channelID);
		if (!channel.isVoice()) return `Ошибка канала`;
		const result = await this.dMusic.play({
			authorID: userID,
			channel: channel,
			channelID: c.channelID,
			url: url,
			force: force,
			client: this.client,
		});
		this.filterArray(userID);
		if (result.error) return result.errorMessage;
		return result.content;
	}

	public async changeVoiceName(userID: string, n: string) {
		const c = await this.DiscordVoiceModel.findOne({ownerID: userID}).exec();
		c.nameHistory.push(c.name);
		c.name = n;
		await c.save();
		const channel = await this.guild.channels.fetch(c.channelID);
		await channel.edit({name: n});
		this.filterArray(userID);
	}

	private filterArray(userID: string) {
		this.waiting = this.waiting.filter(s => s.id !== userID);
	}

	private sleep(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	private async clearHistory(channel: ds.DMChannel | ds.PartialDMChannel | ds.NewsChannel | ds.TextChannel | ds.ThreadChannel | ds.VoiceChannel) {
		const messages = await channel.messages.fetch();
		if (messages) for (const ms of messages.toJSON()) await ms.delete().catch(() => null);
	}

	private async informationChannel() {
		const channel = await this.client.channels.fetch(`865580513879261194`);
		if (!channel.isText()) return;
		await this.clearHistory(channel);

		const button = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: `Роли`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `role_init`,
			})
		);

		await channel.send({components: [button]});
	}

	private async voiceChannel() {
		const channel = await this.client.channels.fetch(`983133016681492551`);
		if (!channel.isText()) return;
		await this.clearHistory(channel);

		const button = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: `Создать`,
				type: `BUTTON`,
				style: `SUCCESS`,
				customId: `voice_init`,
			})
		).addComponents(
			new ds.MessageButton({
				label: `Настроить`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_settings`,
			})
		).addComponents(
			new ds.MessageButton({
				label: `Музыка`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_music_init`,
			})
		);

		await channel.send({components: [button]});
	}

	private async nsfwCheckChannel() {
		const channel = await this.client.channels.fetch(`990342496120864768`);
		if (!channel.isText()) return;
		await this.clearHistory(channel);

		const button = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: `Мне есть 18 лет`,
				type: `BUTTON`,
				style: `DANGER`,
				customId: `nsfw_18`,
			})
		);

		await channel.send({components: [button]});
	}

	private async settingChannels() {
		await this.informationChannel();
		await this.voiceChannel();
		await this.nsfwCheckChannel();
		await this.interactions();
	}

	private async nsfw18(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Смотрю дату рождения`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const member = await this.guild.members.fetch(interaction.user.id);
		const roles = member.roles.cache.toJSON();
		const role = await this.guild.roles.fetch(`990342545286500352`);

		if (!roles.includes(role)) {
			await member.roles.add(role);
			embed.description = `✅ Роль выдана`;
			await interaction.editReply({embeds: [embed]});
		}
	}

	private async infIntInit(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Получаю список ролей`,
		});

		await interaction.reply({embeds: [embed], ephemeral: true});

		await this.sleep(300);

		embed.description = `✅ Список ролей получен`;

		const buttons = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: `🎲 Tabletop`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `role_tabletop`,
			})
		).addComponents(
			new ds.MessageButton({
				label: `🚚 ETS 2`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `role_ets2`,
			}));

		await interaction.editReply({embeds: [embed], components: [buttons]});
	}

	private async infIntRole(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Разбираюсь с ролями`,
		});

		await interaction.reply({embeds: [embed], ephemeral: true});

		const member = await this.guild.members.fetch(interaction.user.id);
		const roles = member.roles.cache.toJSON();

		let role: ds.Role;
		if (interaction.customId === `role_tabletop`) {
			role = await this.guild.roles.fetch(`990297731174129685`);
		} else if (interaction.customId === `role_ets2`) {
			role = await this.guild.roles.fetch(`990297817627103302`);
		} else {
			embed.description = `✅ Разбираюсь с ролями\n❌ Роль не доступна`;
			await interaction.editReply({embeds: [embed]});
			return;
		}
		if (!roles.includes(role)) {
			embed.description = `✅ Разбираюсь с ролями\n⌛️ Добавляю роль`;
			await interaction.editReply({embeds: [embed]});
			await member.roles.add(role);
			embed.description = `✅ Разбираюсь с ролями\n✅ Добавляю роль`;
			await interaction.editReply({embeds: [embed]});
		} else {
			embed.description = `✅ Разбираюсь с ролями\n⌛️ Удаляю роль`;
			await interaction.editReply({embeds: [embed]});
			await member.roles.remove(role);
			embed.description = `✅ Разбираюсь с ролями\n✅ Удаляю роль`;
			await interaction.editReply({embeds: [embed]});
		}
	}

	private async voiceIntInit(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Создаю голосовой канал`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();

		if (c) {
			embed.description = `❌ Голосовой канал уже создан`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		const pChannel = await this.guild.channels.fetch(`984884006036332664`);
		const options: ds.GuildChannelCreateOptions = {
			type: `GUILD_VOICE`,
			position: pChannel.parent.position + 10,
			parent: pChannel.parent,
			reason: `Create channel for ${interaction.user.username}`,
		};
		const ch = await this.guild.channels.create(`Говорилка`, options);
		await new this.DiscordVoiceModel({
			ownerID: interaction.user.id,
			name: `Говорилка`,
			limit: 0,
			channelID: ch.id,
			nameHistory: [],
		}).save();

		embed.description = `✅ Голосовой канал создан`;
		await interaction.editReply({embeds: [embed]});
	}

	private async voiceIntSetting(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();

		const button = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: `Изменить лимит`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_limit`,
				disabled: (c == null),
			})
		).addComponents(
			new ds.MessageButton({
				label: `Изменить название`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_name`,
				disabled: (c == null),
			})
		).addComponents(
			new ds.MessageButton({
				label: `Удалить`,
				type: `BUTTON`,
				style: `DANGER`,
				customId: `voice_rm`,
				disabled: (c == null),
			})
		);

		await interaction.reply({components: [button], ephemeral: true});
	}

	private async voiceIntChangeName(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Подготовка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const w = this.waiting.filter(s => s.id === interaction.user.id);
		if (w.length > 0) {
			if (w[0].s !== `name`) {
				this.filterArray(interaction.user.id);
				embed.description = `✅ Подготовка\n❌ Ты еще не закончил с другим, начни заново`;
				await interaction.editReply({embeds: [embed]});
				return;
			}
			embed.description = `✅ Подготовка\n⚠️ Пришли название канала в чат`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		this.waiting.push({id: interaction.user.id, s: `name`});
		embed.description = `✅ Подготовка\n⚠️ Пришли название канала в чат`;
		await interaction.editReply({embeds: [embed]});
	}

	private async voiceIntLimit(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Подготовка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const w = this.waiting.filter(s => s.id === interaction.user.id);
		if (w.length > 0) {
			if (w[0].s !== `name`) {
				this.filterArray(interaction.user.id);
				embed.description = `✅ Подготовка\n❌ Ты еще не закончил с другим, начни заново`;
				await interaction.editReply({embeds: [embed]});
				return;
			}
			embed.description = `✅ Подготовка\n⚠️ Пришли число`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		this.waiting.push({id: interaction.user.id, s: `limit`});
		embed.description = `✅ Подготовка\n⚠️ Пришли число`;
		await interaction.editReply({embeds: [embed]});
	}

	private async voiceIntRm(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Удаление`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();
		if (!c) {
			embed.description = `✅ Канал уже удален`;
			await interaction.editReply({embeds: [embed]});
		}
		const ch = await this.guild.channels.fetch(c.channelID);
		const s = await ch.delete()
			.then(() => true)
			.catch(async () => {
				embed.description = `❌ Канал не может быть удален`;
				await interaction.editReply({embeds: [embed]});
				return false;
			});
		if (!s) return;
		await c.remove();

		embed.description = `✅ Канал удален`;
		await interaction.editReply({embeds: [embed]});
	}

	private async voiceIntMusic(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const mi = this.dMusic.information;

		const button = new ds.MessageActionRow().addComponents(
			new ds.MessageButton({
				label: (mi.state) ? `Добавить` : `Включить`,
				type: `BUTTON`,
				style: `SUCCESS`,
				customId: `voice_music_p`,
			})
		).addComponents(
			new ds.MessageButton({
				label: `Пропустить`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_music_sk`,
				disabled: (!mi.state || mi.queue.length === 0),
			})
		).addComponents(
			new ds.MessageButton({
				label: (mi.onPause) ? `Снять с паузы` : `Поставить на паузу`,
				type: `BUTTON`,
				style: `PRIMARY`,
				customId: `voice_music_pa`,
				disabled: (!mi.state || mi.queue.length === 0),
			})
		).addComponents(
			new ds.MessageButton({
				label: `Очередь`,
				type: `BUTTON`,
				style: `SECONDARY`,
				customId: `voice_music_q`,
				disabled: (mi.queue.length === 0),
			})
		).addComponents(
			new ds.MessageButton({
				label: `Остановить`,
				type: `BUTTON`,
				style: `DANGER`,
				customId: `voice_music_s`,
				disabled: (!mi.state),
			})
		);

		await interaction.reply({components: [button], ephemeral: true});
	}

	private async musicIntPlay(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Подготовка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();

		if (!c) {
			embed.description = `❌ Голосовой канал не найден`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		const w = this.waiting.filter(s => s.id === interaction.user.id);
		if (w.length > 0) {
			if (w[0].s !== `music`) {
				this.filterArray(interaction.user.id);
				embed.description = `✅ Подготовка\n❌ Ты еще не закончил с другим, начни заново`;
				await interaction.editReply({embeds: [embed]});
				return;
			}
			embed.description = `✅ Подготовка\n⚠️ Пришли ссылку в чат`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		this.waiting.push({id: interaction.user.id, s: `music`});
		embed.description = `✅ Подготовка\n⚠️ Пришли ссылку в чат`;
		await interaction.editReply({embeds: [embed]});
	}

	private async musicIntStop(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Остановка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		await this.dMusic.stop(interaction.user.id, false);

		embed.description = `✅ Остановка`;
		await interaction.editReply({embeds: [embed]});
	}

	private async musicIntSkip(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Пропуск`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();
		await this.dMusic.skip({
			channelID: c.channelID,
			force: false,
		});

		embed.description = `✅ Пропуск`;
		await interaction.editReply({embeds: [embed]});
	}

	private async musicIntQueue(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Получение очереди`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const result = await this.dMusic.getQueue();

		if (result === `Музыка не активна` || result === `Очередь пуста`) {
			embed.description = `❌ ${result}`;
		} else {
			let qu = ``;
			for (const i in result) {
				qu += `${result[i].url} | <@${result[i].authorID}>\n`;
			}
			embed.description = `✅ Получение очереди\n------------\n${qu}`;
		}

		await interaction.editReply({embeds: [embed]});
	}

	private async musicIntPause(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Подготовка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		const mi = this.dMusic.information;
		const c = await this.DiscordVoiceModel.findOne({ownerID: interaction.user.id}).exec();
		if (mi.onPause) {
			await this.dMusic.unPause({
				channelID: c.channelID,
				force: false,
			});
			embed.description = `✅ Музыка снята с паузы`;
		} else {
			await this.dMusic.pause({
				channelID: c.channelID,
				force: false,
			});
			embed.description = `✅ Музыка поставлена на паузу`;
		}

		await interaction.editReply({embeds: [embed]});
	}

	private async imageIntRm(interaction: ds.Interaction) {
		if (!interaction.isButton()) return;

		const embed = new ds.MessageEmbed({
			description: `⌛️ Проверка`,
		});
		await interaction.reply({embeds: [embed], ephemeral: true});

		if (interaction.user.id !== `308924864407011328`) {
			embed.description = `❌ Функция доступна только модераторам`;
			await interaction.editReply({embeds: [embed]});
			return;
		}

		const channel = await this.client.channels.fetch(interaction.channelId);
		if (!channel.isText()) return;
		const ms = await channel.messages.fetch(interaction.message.id);
		await ms.delete();

		embed.description = `✅ Удалено`;
		await interaction.editReply({embeds: [embed]});
	}

	private async interactions() {
		this.client.on(`interactionCreate`, async interaction => {
			if (!interaction.isButton()) return;

			if (interaction.customId === `role_init`) {
				await this.infIntInit(interaction);
			} else if (
				interaction.customId === `role_tabletop` ||
				interaction.customId === `role_ets2`
			) {
				await this.infIntRole(interaction);
			} else if (interaction.customId === `voice_init`) {
				await this.voiceIntInit(interaction);
			} else if (interaction.customId === `voice_settings`) {
				await this.voiceIntSetting(interaction);
			} else if (interaction.customId === `voice_limit`) {
				await this.voiceIntLimit(interaction);
			} else if (interaction.customId === `voice_name`) {
				await this.voiceIntChangeName(interaction);
			} else if (interaction.customId === `voice_rm`) {
				await this.voiceIntRm(interaction);
			} else if (interaction.customId === `voice_music_init`) {
				await this.voiceIntMusic(interaction);
			} else if (interaction.customId === `voice_music_p`) {
				await this.musicIntPlay(interaction);
			} else if (interaction.customId === `voice_music_sk`) {
				await this.musicIntSkip(interaction);
			} else if (interaction.customId === `voice_music_s`) {
				await this.musicIntStop(interaction);
			} else if (interaction.customId === `voice_music_pa`) {
				await this.musicIntPause(interaction);
			} else if (interaction.customId === `voice_music_q`) {
				await this.musicIntQueue(interaction);
			} else if (interaction.customId === `nsfw_18`) {
				await this.nsfw18(interaction);
			} else if (interaction.customId === `image_rm`) {
				await this.imageIntRm(interaction);
			}
		});
	}
}

export interface Waiting {
	id: string;
	s: string;
}
import {Cron} from "@nestjs/schedule";
import * as ds from "discord.js";

export class DVoice {
	private client: ds.Client;
	private guild: ds.Guild;
	private voiceSettings: VoiceSettings = {
		users: [],
		rooms: {
			name: `Переговорная`,
			ids: {
				infinity: `963168191813668954`,
			},
		},
	};
	private limit = 5;

	public init(c: ds.Client, g: ds.Guild) {
		this.client = c;
		this.guild = g;
	}

	private deleteFunction = (channelNew: ds.GuildChannel) => {
		if (channelNew.members.first() == null) {
			channelNew.delete();
			return true;
		}
		return false;
	};

	private repeatCheck = (channelNew: ds.GuildChannel) => {
		setTimeout(() => {
			this.deleteChannel(channelNew);
		}, 1000);
	};

	private deleteChannel = (channelNew: ds.GuildChannel) => {
		if (this.deleteFunction(channelNew) === false) this.repeatCheck(channelNew);
	};

	/**
	 * It deletes all voice channels that are empty
	 */
	@Cron(`0 */1 * * * *`)
	private async cleaner() {
		if (!this.client) return;
		const channels: ds.GuildChannel[] = [];
		this.guild.channels.cache.forEach(channel => {
			if (
				channel.type === `GUILD_VOICE` &&
				(channel.name === this.voiceSettings.rooms.name ||
					channel.name === `📣│ Алиса`)
			) {
				channels.push(channel);
			}
		});
		for (const i in channels) {
			if (!channels[i].members.first()) {
				channels[i]
					.delete()
					.catch(() => null);
			}
		}
	}

	/**
	 * It removes users from the voiceSettings.users array if they were added more than 5 minutes ago
	 */
	@Cron(`0 */1 * * * *`)
	private clearUsers() {
		if (!this.client) return;
		const filtered: VoiceMember[] = [];
		for (const user of this.voiceSettings.users) {
			if (user.addedAt > Date.now() + 5 * 60 * 1000) filtered.push(user);
		}
		this.voiceSettings.users = filtered;
	}

	/**
	 * It creates a new voice channel with the name `📣│ Алиса` and places it in the category `Голосовые`
	 */
	public async createChannelForAlisa() {
		if (!this.guild) return;
		const parentChannel = await this.guild.channels.fetch(`964616843392319488`);
		const options: ds.GuildChannelCreateOptions = {
			type: `GUILD_VOICE`,
			position: parentChannel.parent.position + 10,
			parent: parentChannel.parent,
			reason: `Created channel for `,
			userLimit: 1,
		};
		const name = `📣│ Алиса`;
		this.guild.channels.create(name, options);
	}

	/**
	 * It returns the user object from the voiceSettings.users array, or creates a new one if it doesn't
	 * exist
	 * @param {number} userID - The user's ID.
	 * @returns The user object
	 */
	private getUserObject(userID: string) {
		for (const user of this.voiceSettings.users) {
			if (user.id === userID) return user;
		}
		const obj: VoiceMember = {
			id: userID,
			created: 0,
			addedAt: Date.now(),
		};
		this.voiceSettings.users.push(obj);
		return obj;
	}

	/**
	 * It takes a user object, and replaces the user object in the array with the same ID as the user
	 * object passed in.
	 * @param {VoiceMember} user - The user object that is being updated.
	 */
	private updateUserObject(user: VoiceMember) {
		const filtered: VoiceMember[] = [];
		for (let u of this.voiceSettings.users) {
			if (u.id === user.id) {
				u = user;
			}
			filtered.push(u);
		}
	}

	/**
	 * If the user is banned, return false. If the user is not banned, but created voice channels
	 * more than 10 times, ban them for 5 minutes. If the user is banned, but their ban has expired,
	 * return true. If the user is not banned, and created the voice channels less than 10 times,
	 * return true.
	 * @param {VoiceMember} user - VoiceMember - The user object that is being checked.
	 * @returns A boolean value.
	 */
	private checkUser(user: VoiceMember): boolean {
		if (user.ban) return false;
		else if (user.created >= this.limit && !user.ban) {
			user.ban = true;
			user.banAt = Date.now();
			user.banTime = 5 * 60 * 1000;
			this.updateUserObject(user);
			return false;
		} else if (user.created >= this.limit) {
			if (Date.now() < user.banAt + user.banTime) {
				const u: VoiceMember = {
					id: user.id,
					created: 0,
					addedAt: Date.now(),
				};
				this.updateUserObject(u);
				return true;
			}
			return false;
		}
		return true;
	}

	private async createChannel(channel: ds.VoiceChannel, limit: number) {
		const parent = channel.parent;
		const user = channel.members.first();
		const userObject = this.getUserObject(user.id);
		const name = this.voiceSettings.rooms.name;
		const options: ds.GuildChannelCreateOptions = {
			type: `GUILD_VOICE`,
			position: parent.position + 10,
			parent: parent,
			reason: `Created channel for ${user.user.username}`,
		};
		if (limit > 0) options.userLimit = limit;
		let userVoiceState: ds.VoiceState = null;
		await this.guild.members.fetch(user.id).then(member => {
			userVoiceState = member.guild.voiceStates.cache.find(
				userFind => userFind.id === user.id
			);
		});
		if (userObject.ban && userObject.ban === true) {
			userVoiceState.disconnect(`User created too many channels`);
			return;
		}
		let idNew: string = null;
		this.guild.members.fetch(user.id).then(() => {
			if (!this.checkUser(userObject)) {
				userVoiceState.disconnect(`Check return false`);
				return;
			}

			this.guild.channels.create(name, options).then(async data => {
				idNew = data.id;
				const channelNew: ds.VoiceChannel = await this.guild.channels
					.fetch(idNew)
					.then((ch: ds.VoiceChannel) => ch);
				userVoiceState.setChannel(channelNew);
				userObject.created++;
				this.repeatCheck(channelNew);

				this.updateUserObject(userObject);
			});
		});
	}

	/**
	 * It checks if the voice channel is full, and if it is, it creates a new channel with the limit
	 */
	@Cron(`*/1 * * * * *`)
	private async voiceManager() {
		if (!this.client) return;

		/**
		 * Limit: infinity
		 */
		this.client.channels
			.fetch(this.voiceSettings.rooms.ids.infinity)
			.then(async (channel: ds.VoiceChannel | null) => {
				if (channel == null || channel.full == null || channel.full === false) {
					return;
				}
				await this.createChannel(channel, 0);
			});
	}
}

export interface VoiceSettings {
	users: VoiceMember[];
	rooms: {
		name: string;
		ids: {
			infinity: string;
		};
	};
}

export interface VoiceMember {
	id: string;
	created: number;
	addedAt: number;
	ban?: boolean;
	banTime?: number;
	banAt?: number;
}
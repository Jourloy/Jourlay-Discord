import * as ds from "discord.js";

export class DTool {

	public init(c: ds.Client, g: ds.Guild) {
		this.client = c;
		this.guild = g;
	}

	private client: ds.Client;
	private guild: ds.Guild;

	/**
	 * It deletes a message after a certain amount of time
	 * @param msg - The message you want to delete.
	 * @param {number} time - The time in milliseconds to wait before deleting the message.
	 * @returns A promise that will delete the message after the specified time.
	 */
	public msgDelete(msg: ds.Message, time: number) {
		const t = setTimeout(async () => {
			if (msg.deletable) await msg.delete();
		}, time);
		return {error: false, timeout: t};
	}

	/**
	 * It checks if the user is a moderator.
	 * @param {string} userID - The user's ID.
	 * @returns A boolean value.
	 */
	public async isMod(userID: string): Promise<boolean> {
		const userMod = await this.guild.members
			.fetch(userID)
			.then(user =>
				user.roles.cache.find(role => role.id === `799561051905458176`)
			);
		return userMod != null;
	}
}
import {Logger} from "@nestjs/common";
import * as ds from "discord.js";

export class Tools {

	constructor(c: ds.Client, g: ds.Guild) {
		this.client = c;
		this.guild = g;
	}

	private logger = new Logger(Tools.name);

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
}
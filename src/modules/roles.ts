import * as ds from "discord.js";

export class DRoles {

	private client: ds.Client;
	private guild: ds.Guild;

	public init(c: ds.Client, g: ds.Guild) {
		this.client = c;
		this.guild = g;
	}

	/**
	 * It fetches the role and the user, then adds the role to the user
	 * @param {string} u - string - The user's ID
	 * @param {string} r - string - The role ID
	 * @returns A promise that resolves to an object with the following properties:
	 * 	error: boolean
	 * 	description: string
	 * 	reason: string
	 */
	private async setRole(u: string, r: string): Promise<Output> {
		const role = await this.guild.roles.fetch(r);
		const user = await this.guild.members.fetch(u);
		return await user.roles
			.add(role)
			.then(() => ({error: false, description: `Role successfully set`}))
			.catch(err => ({error: true, reason: err}));
	}

	/**
	 * It removes a role from a user
	 * @param {string} u - string - The user's ID
	 * @param {string} r - string - The role ID
	 * @returns An object with two properties, error and description.
	 */
	private async removeRole(u: string, r: string) {
		const role = await this.guild.roles.fetch(r);
		const user = await this.guild.members.fetch(u);
		return await user.roles
			.remove(role)
			.then(() => ({error: false, description: `Role successfully removed`}))
			.catch(e => ({error: true, reason: e}));
	}
}

export interface Output {
	error: boolean;
	description?: string;
	reason?: string;
}
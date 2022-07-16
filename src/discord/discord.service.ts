import { Injectable } from '@nestjs/common';
import * as ds from "discord.js";

@Injectable()
export class DiscordService {

	private client: ds.Client = null;
	private guild: ds.Guild = null;


}

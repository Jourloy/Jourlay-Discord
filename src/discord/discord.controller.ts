import {Controller} from '@nestjs/common';
import {DiscordService} from './discord.service';

@Controller()
export class DiscordController {
	constructor(private readonly discordService: DiscordService) {
	}
}

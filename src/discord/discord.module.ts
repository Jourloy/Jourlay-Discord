import {Module} from '@nestjs/common';
import {DiscordService} from './discord.service';
import {DiscordController} from './discord.controller';
import {DMusic} from "../modules/music";
import {DMenu} from "../modules/menu";
import {DVoice} from "../modules/voice";
import {MongooseModule} from "@nestjs/mongoose";
import {DiscordVoice, DiscordVoiceSchema} from "../schemas/voiceChannel.schema";
import {DTool} from "../modules/tools";

@Module({
	imports: [
		MongooseModule.forFeature([
			{name: DiscordVoice.name, schema: DiscordVoiceSchema},
		]),
	],
	controllers: [DiscordController],
	providers: [DiscordService, DMusic, DMenu, DVoice, DTool]
})
export class DiscordModule {
}

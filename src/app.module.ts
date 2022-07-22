import {Module} from '@nestjs/common';
import {DiscordModule} from './discord/discord.module';
import {MongooseModule} from "@nestjs/mongoose";
import {ConfigModule, ConfigService} from "@nestjs/config";

@Module({
	imports: [
		DiscordModule,
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: `mongodb://${configService.get<string>(`MONGO_HOST`)}/jourlay`,
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [],
	providers: [],
})
export class AppModule {
}

import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document} from "mongoose";

export type DiscordVoiceDocument = DiscordVoice & Document;

@Schema()
export class DiscordVoice {
	@Prop()
	ownerID: string;

	@Prop()
	name: string;

	@Prop()
	limit: number;

	@Prop()
	nameHistory: string[];

	@Prop()
	channelID: string;

	@Prop()
	createdAt: number;
}

export const DiscordVoiceSchema = SchemaFactory.createForClass(DiscordVoice);
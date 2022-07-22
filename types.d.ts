/* eslint-disable @typescript-eslint/no-unused-vars */

export namespace DiscordMusicType {
	interface Information {
		state: boolean;
		onPause: boolean;
		queue: QueueRequest[];
		nowPlaying: QueueRequest;
		connection: voice.VoiceConnection;
		authorID: string;
		player: voice.AudioPlayer;
		guild: Guild;
		updated: number;
		channelID: string;
		client: ds.Client;
	}

	interface QueueRequest {
		url: string;
		authorID: string;
	}

	interface PlayTypes {
		url: string;
		authorID: string;
		channelID: string;
		channel: ds.VoiceChannel | ds.StageChannel;
		force: boolean;
		client: ds.Client;
	}

	interface PauseTypes {
		channelID: string;
		force?: boolean;
	}

	interface ChangeQueueOwnerTypes {
		ownerID: string;
		nextOwnerID: string;
		force?: boolean;
	}

	interface Return {
		error: boolean;
		errorMessage?: string;
		content?: any;
		contentType?: InstanceType;
	}
}
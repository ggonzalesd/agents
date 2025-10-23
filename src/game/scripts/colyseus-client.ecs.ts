import { Client, getStateCallbacks, type Room } from 'colyseus.js';
import type { SchemaCallbackProxy } from '@colyseus/schema';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';
import { Option } from '#/utils/Option';
import { Observer } from '#/utils/Observer';
import { Result } from '#/utils/Result';
import { UIClientEcs } from './uiClient.ecs';

export class ColyseusClientEcs extends ComponentEcs {
	private connectionString: string;
	private token: string;
	private client: Client;
	private roomId: string;

	public connection: Option<{
		room: Room<GameState>;
		proxy: SchemaCallbackProxy<GameState>;
	}> = Option.none();

	public alarm: Observer = new Observer();

	constructor(connectionString: string, token: string, roomId: string) {
		super();
		this.connectionString = connectionString;
		this.token = token;
		this.roomId = roomId;

		this.client = new Client(this.connectionString);
		this.client.auth.token = this.token;
	}

	async connect() {
		const roomResult = await Result.wrapAsync(
			this.client.joinById<GameState>(this.roomId),
		);

		if (!roomResult.success) {
			console.error('Failed to join room:', roomResult.error);
			this.connection.clear();
			this.world.get(UIClientEcs).ifSome((ui) => {
				ui.game.setPause(true, 'ONLEAVE');
			});
			return;
		}

		const room = roomResult.value;

		const proxy = getStateCallbacks(room);

		room.onLeave((code, reason) => {
			console.warn(`Left the room: ${code} (${reason})`);
			this.connection.clear();
			this.world.get(UIClientEcs).ifSome((ui) => {
				ui.game.setPause(true, 'ONLEAVE');
			});
		});

		this.connection.populate({ room, proxy });

		this.alarm.notify();

		this.callOnDelete(() => {
			room.leave();
		});
	}

	public isClient(id: string) {
		return this.connection
			.pick('room')
			.filter(
				({ connection, sessionId }) => connection.isOpen && sessionId === id,
			)
			.isSome();
	}
}

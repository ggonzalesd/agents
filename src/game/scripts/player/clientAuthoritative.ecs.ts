import type { Room } from 'colyseus.js';

import type { GameState } from '#/state/game.state';

import { ComponentEcs } from '#/ecs/Component.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import type { PlayerState } from '#/state/player.state';
import { RecordEcs } from '#/ecs/lib/Record.ecs';

type ClientAuthoritativeSharedState = {
	isMoving: boolean;
	direction: number;
};

export class ClientAuthoritative extends ComponentEcs {
	public state: ClientAuthoritativeSharedState;
	private needsSend = false;

	private colyseusClient: ColyseusClientEcs = null!;
	private record: RecordEcs = null!;

	constructor() {
		super();
		this.state = {
			isMoving: false,
			direction: 0,
		};
	}

	public get(): Readonly<ClientAuthoritativeSharedState> {
		return this.state;
	}

	public update(newState: Partial<ClientAuthoritativeSharedState>) {
		this.state = { ...this.state, ...newState };
		this.needsSend = true;
	}

	private sendState({ room }: { room: Room<GameState> }) {
		room.send('client:state', this.state);
	}

	onStart(): void {
		this.colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClientEcs not found');

		this.record = this.world
			.getEntity(this.parent)
			.map((e) => e.get(RecordEcs))
			.collapse()
			.unwrap('RecordEcs not found');
	}

	onLoop(_delta: number): void {
		const state = this.record.getUnsafeRecord<PlayerState>('state');

		if (!this.needsSend) return;
		if (!this.colyseusClient.isClient(state.sessionId ?? '')) return;

		this.colyseusClient.connection.ifSome(this.sendState.bind(this));
	}
}

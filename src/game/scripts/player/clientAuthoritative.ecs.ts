import type { Room } from 'colyseus.js';

import type { GameState } from '#/state/game.state';

import { ComponentEcs } from '#/ecs/Component.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';

type ClientAuthoritativeSharedState = {
	isMoving: boolean;
	direction: number;
};

export class ClientAuthoritative extends ComponentEcs {
	public state: ClientAuthoritativeSharedState;
	private needsSend = false;

	private colyseusClient: ColyseusClientEcs = null!;

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
	}

	onLoop(_delta: number): void {
		if (!this.needsSend) return;
		if (!this.colyseusClient.isClient(this.parent ?? '')) return;

		this.colyseusClient.connection.ifSome(this.sendState.bind(this));
	}
}
